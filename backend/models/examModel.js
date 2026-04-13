const mockData = require('../data/mockData');

class ExamModel {
  // Get all exams
  async getAllExams(filters = {}) {
    let exams = [...mockData.exams];
    
    if (filters.term) {
      exams = exams.filter(e => e.term === parseInt(filters.term));
    }
    if (filters.status) {
      exams = exams.filter(e => e.status === filters.status);
    }
    if (filters.academic_year) {
      exams = exams.filter(e => e.academic_year === filters.academic_year);
    }
    
    return exams;
  }
  
  // Get exam by ID
  async getExamById(id) {
    const exam = mockData.exams.find(e => e.id === parseInt(id));
    if (!exam) return null;
    
    const examTimetable = mockData.exam_timetables.filter(et => et.exam_id === exam.id);
    return {
      ...exam,
      timetable: examTimetable
    };
  }
  
  // Create new exam
  async createExam(examData) {
    const newExam = {
      id: mockData.getNextId('exams'),
      ...examData,
      created_at: new Date().toISOString()
    };
    mockData.exams.push(newExam);
    return newExam;
  }
  
  // Update exam
  async updateExam(id, updateData) {
    const index = mockData.exams.findIndex(e => e.id === parseInt(id));
    if (index === -1) return null;
    
    mockData.exams[index] = {
      ...mockData.exams[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    return mockData.exams[index];
  }
  
  // Delete exam
  async deleteExam(id) {
    const index = mockData.exams.findIndex(e => e.id === parseInt(id));
    if (index === -1) return false;
    
    mockData.exams.splice(index, 1);
    mockData.exam_timetables = mockData.exam_timetables.filter(et => et.exam_id !== parseInt(id));
    return true;
  }
  
  // Get exam timetable
  async getExamTimetable(examId) {
    const exam = await this.getExamById(examId);
    if (!exam) return null;
    
    const timetable = mockData.exam_timetables.filter(et => et.exam_id === parseInt(examId));
    
    const timetableWithDetails = timetable.map(entry => {
      const classData = mockData.classes.find(c => c.id === entry.class_id);
      return {
        ...entry,
        class_name: classData ? classData.name : 'Unknown'
      };
    });
    
    return {
      exam: {
        id: exam.id,
        name: exam.name,
        start_date: exam.start_date,
        end_date: exam.end_date
      },
      timetable: timetableWithDetails
    };
  }
  
  // Add exam timetable entry
  async addExamTimetableEntry(entryData) {
    const newEntry = {
      id: mockData.getNextId('exam_timetables'),
      ...entryData,
      created_at: new Date().toISOString()
    };
    mockData.exam_timetables.push(newEntry);
    return newEntry;
  }
  
  // Get student exam results
  async getStudentExamResults(studentId, examId) {
    const student = mockData.students.find(s => s.id === parseInt(studentId));
    if (!student) return null;
    
    const exam = await this.getExamById(examId);
    if (!exam) return null;
    
    const grades = mockData.grades.filter(g => 
      g.student_id === parseInt(studentId) && 
      g.term === exam.term &&
      g.academic_year === exam.academic_year
    );
    
    const totalScore = grades.reduce((sum, g) => sum + g.total_score, 0);
    const average = grades.length > 0 ? totalScore / grades.length : 0;
    
    return {
      student: {
        name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        class: student.class_id
      },
      exam: {
        name: exam.name,
        term: exam.term,
        academic_year: exam.academic_year
      },
      results: grades,
      summary: {
        total_subjects: grades.length,
        total_score: totalScore.toFixed(2),
        average_score: average.toFixed(2)
      }
    };
  }
}

module.exports = new ExamModel();