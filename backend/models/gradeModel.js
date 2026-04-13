const mockData = require('../data/mockData');

class GradeModel {
  // Grading scale
  getGradeScale(score) {
    if (score >= 90) return { grade: "A", grade_point: 5.0, description: "Excellent" };
    if (score >= 80) return { grade: "B", grade_point: 4.0, description: "Good" };
    if (score >= 70) return { grade: "C", grade_point: 3.0, description: "Average" };
    if (score >= 60) return { grade: "D", grade_point: 2.0, description: "Below Average" };
    if (score >= 50) return { grade: "E", grade_point: 1.0, description: "Pass" };
    return { grade: "F", grade_point: 0.0, description: "Fail" };
  }
  
  // Get all grades with filters
  async getAllGrades(filters = {}) {
    let grades = [...mockData.grades];
    
    if (filters.student_id) {
      grades = grades.filter(g => g.student_id === parseInt(filters.student_id));
    }
    if (filters.class_id) {
      grades = grades.filter(g => g.class_id === parseInt(filters.class_id));
    }
    if (filters.term) {
      grades = grades.filter(g => g.term === parseInt(filters.term));
    }
    if (filters.academic_year) {
      grades = grades.filter(g => g.academic_year === filters.academic_year);
    }
    if (filters.subject) {
      grades = grades.filter(g => g.subject === filters.subject);
    }
    
    // Add student names
    const gradesWithNames = grades.map(grade => {
      const student = mockData.students.find(s => s.id === grade.student_id);
      return {
        ...grade,
        student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown'
      };
    });
    
    return gradesWithNames;
  }
  
  // Get grade by ID
  async getGradeById(id) {
    const grade = mockData.grades.find(g => g.id === parseInt(id));
    if (!grade) return null;
    
    const student = mockData.students.find(s => s.id === grade.student_id);
    return {
      ...grade,
      student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown'
    };
  }
  
  // Create new grade
  async createGrade(gradeData) {
    const { total_score } = gradeData;
    const { grade, grade_point, description } = this.getGradeScale(total_score);
    
    const newGrade = {
      id: mockData.getNextId('grades'),
      ...gradeData,
      grade,
      grade_point,
      remarks: gradeData.remarks || description,
      recorded_at: new Date().toISOString()
    };
    
    mockData.grades.push(newGrade);
    return newGrade;
  }
  
  // Update grade
  async updateGrade(id, updateData) {
    const index = mockData.grades.findIndex(g => g.id === parseInt(id));
    if (index === -1) return null;
    
    // Recalculate grade if score changed
    if (updateData.total_score) {
      const { grade, grade_point, description } = this.getGradeScale(updateData.total_score);
      updateData.grade = grade;
      updateData.grade_point = grade_point;
      if (!updateData.remarks) updateData.remarks = description;
    }
    
    mockData.grades[index] = {
      ...mockData.grades[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    
    return mockData.grades[index];
  }
  
  // Delete grade
  async deleteGrade(id) {
    const index = mockData.grades.findIndex(g => g.id === parseInt(id));
    if (index === -1) return false;
    
    mockData.grades.splice(index, 1);
    return true;
  }
  
  // Get student report card
  async getStudentReportCard(studentId, term, academicYear) {
    const student = mockData.students.find(s => s.id === parseInt(studentId));
    if (!student) return null;
    
    const grades = mockData.grades.filter(g => 
      g.student_id === parseInt(studentId) &&
      g.term === term &&
      g.academic_year === academicYear
    );
    
    const classData = mockData.classes.find(c => c.id === student.class_id);
    const subjects = mockData.subjects[classData.level] || [];
    
    // Calculate summary
    const totalScore = grades.reduce((sum, g) => sum + g.total_score, 0);
    const averageScore = grades.length > 0 ? totalScore / grades.length : 0;
    const { grade, grade_point } = this.getGradeScale(averageScore);
    
    return {
      student: {
        name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        class: classData.name,
        level: classData.level
      },
      academic_info: {
        term,
        term_name: `Term ${term}`,
        academic_year: academicYear
      },
      subjects: subjects.map(subject => {
        const gradeRecord = grades.find(g => g.subject === subject);
        return {
          subject,
          continuous_assessment: gradeRecord?.continuous_assessment || 'N/A',
          exam_score: gradeRecord?.exam_score || 'N/A',
          total_score: gradeRecord?.total_score || 'N/A',
          grade: gradeRecord?.grade || 'N/A',
          remarks: gradeRecord?.remarks || 'Not graded yet'
        };
      }),
      summary: {
        total_subjects: subjects.length,
        graded_subjects: grades.length,
        average_score: averageScore.toFixed(2),
        overall_grade: grade,
        grade_point: grade_point,
        remarks: this.getOverallRemark(averageScore)
      }
    };
  }
  
  // Get class performance summary
  async getClassPerformance(classId, term, academicYear) {
    const students = mockData.getStudentsByClass(parseInt(classId));
    const classData = mockData.classes.find(c => c.id === parseInt(classId));
    
    const studentPerformances = students.map(student => {
      const grades = mockData.grades.filter(g => 
        g.student_id === student.id &&
        g.term === term &&
        g.academic_year === academicYear
      );
      const average = grades.length > 0 
        ? grades.reduce((sum, g) => sum + g.total_score, 0) / grades.length 
        : 0;
      
      return {
        student_name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        average_score: average.toFixed(2),
        grade: this.getGradeScale(average).grade
      };
    });
    
    const classAverage = studentPerformances.length > 0
      ? studentPerformances.reduce((sum, s) => sum + parseFloat(s.average_score), 0) / studentPerformances.length
      : 0;
    
    return {
      class: classData.name,
      level: classData.level,
      term,
      term_name: `Term ${term}`,
      academic_year: academicYear,
      total_students: students.length,
      class_average: classAverage.toFixed(2),
      students: studentPerformances
    };
  }
  
  getOverallRemark(average) {
    if (average >= 90) return "Outstanding performance! Keep up the excellent work.";
    if (average >= 80) return "Very good performance. You're doing great!";
    if (average >= 70) return "Good performance. Keep working hard.";
    if (average >= 60) return "Satisfactory performance. More effort needed.";
    if (average >= 50) return "Passing but needs improvement.";
    return "Needs significant improvement. Please seek help from teachers.";
  }
}

module.exports = new GradeModel();