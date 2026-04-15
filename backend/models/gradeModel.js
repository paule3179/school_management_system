const pool = require('../config/database');

class GradeModel {
  // Get grading scale
  getGradeScale(score) {
    if (isNaN(score)) return { grade: 'N/A', grade_point: 0.0, description: 'No grade available' };
    if (score >= 90) return { grade: 'A', grade_point: 5.0, description: 'Excellent' };
    if (score >= 80) return { grade: 'B', grade_point: 4.0, description: 'Good' };
    if (score >= 70) return { grade: 'C', grade_point: 3.0, description: 'Average' };
    if (score >= 60) return { grade: 'D', grade_point: 2.0, description: 'Below Average' };
    if (score >= 50) return { grade: 'E', grade_point: 1.0, description: 'Pass' };
    return { grade: 'F', grade_point: 0.0, description: 'Fail' };
  }

  // Get all grades with filters
  async getAllGrades(filters = {}) {
    let query = `
      SELECT 
        g.*,
        s.first_name as student_first_name,
        s.last_name as student_last_name,
        s.admission_number,
        c.name as class_name
      FROM grades g
      JOIN students s ON g.student_id = s.id
      JOIN classes c ON g.class_id = c.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 1;
    
    if (filters.student_id) {
      query += ` AND g.student_id = $${paramCount}`;
      values.push(filters.student_id);
      paramCount++;
    }
    if (filters.class_id) {
      query += ` AND g.class_id = $${paramCount}`;
      values.push(filters.class_id);
      paramCount++;
    }
    if (filters.term) {
      query += ` AND g.term = $${paramCount}`;
      values.push(filters.term);
      paramCount++;
    }
    if (filters.academic_year) {
      query += ` AND g.academic_year = $${paramCount}`;
      values.push(filters.academic_year);
      paramCount++;
    }
    
    query += ` ORDER BY g.student_id, g.subject`;
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  // Get grade by ID
  async getGradeById(id) {
    const result = await pool.query(`
      SELECT g.*, s.first_name, s.last_name, s.admission_number
      FROM grades g
      JOIN students s ON g.student_id = s.id
      WHERE g.id = $1
    `, [id]);
    
    return result.rows[0] || null;
  }

  // Get student grades
  async getStudentGrades(studentId, term, academicYear) {
    const result = await pool.query(`
      SELECT * FROM grades 
      WHERE student_id = $1 AND term = $2 AND academic_year = $3
      ORDER BY subject
    `, [studentId, term, academicYear]);
    
    return result.rows;
  }

  // Upsert grade (create or update)
  async upsertGrade(gradeData) {
    const { student_id, subject, term, term_name, academic_year, class_id, continuous_assessment, exam_score } = gradeData;
    
    // Calculate total score
    const total_score = parseFloat(continuous_assessment) + parseFloat(exam_score);
    const { grade, grade_point } = this.getGradeScale(total_score);
    
    // Check if grade exists
    const existing = await pool.query(`
      SELECT id FROM grades 
      WHERE student_id = $1 AND subject = $2 AND term = $3 AND academic_year = $4
    `, [student_id, subject, term, academic_year]);
    
    if (existing.rows.length > 0) {
      // Update existing grade
      const result = await pool.query(`
        UPDATE grades 
        SET continuous_assessment = $1,
            exam_score = $2,
            total_score = $3,
            grade = $4,
            grade_point = $5,
            recorded_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [continuous_assessment, exam_score, total_score, grade, grade_point, existing.rows[0].id]);
      
      return result.rows[0];
    } else {
      // Insert new grade
      const result = await pool.query(`
        INSERT INTO grades (
          student_id, subject, term, term_name, academic_year, class_id,
          continuous_assessment, exam_score, total_score, grade, grade_point
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [student_id, subject, term, term_name, academic_year, class_id,
          continuous_assessment, exam_score, total_score, grade, grade_point]);
      
      return result.rows[0];
    }
  }

  // Update grade
  async updateGrade(id, updateData) {
    const { continuous_assessment, exam_score, remarks } = updateData;
    
    const total_score = parseFloat(continuous_assessment) + parseFloat(exam_score);
    const { grade, grade_point } = this.getGradeScale(total_score);
    
    const result = await pool.query(`
      UPDATE grades 
      SET continuous_assessment = COALESCE($1, continuous_assessment),
          exam_score = COALESCE($2, exam_score),
          total_score = $3,
          grade = $4,
          grade_point = $5,
          remarks = COALESCE($6, remarks),
          recorded_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [continuous_assessment, exam_score, total_score, grade, grade_point, remarks, id]);
    
    return result.rows[0] || null;
  }

  // Delete grade
  async deleteGrade(id) {
    const result = await pool.query('DELETE FROM grades WHERE id = $1 RETURNING *', [id]);
    return result.rows.length > 0;
  }

  // Get class performance
  async getClassPerformance(classId, term, academicYear) {
    const result = await pool.query(`
      SELECT 
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        AVG(g.total_score) as average_score,
        COUNT(g.id) as subjects_count
      FROM students s
      LEFT JOIN grades g ON s.id = g.student_id 
        AND g.term = $2 
        AND g.academic_year = $3
      WHERE s.class_id = $1 AND s.status = 'active'
      GROUP BY s.id, s.first_name, s.last_name, s.admission_number
      ORDER BY average_score DESC
    `, [classId, term, academicYear]);
    
    return result.rows;
  }

  // Generate report card
  async generateReportCard(studentId, term, academicYear) {
    try {
      // Get student info
      const studentInfo = await pool.query(`
        SELECT s.*, c.name as class_name, c.level
        FROM students s
        JOIN classes c ON s.class_id = c.id
        WHERE s.id = $1
      `, [studentId]);
      
      if (studentInfo.rows.length === 0) {
        return null;
      }
      
      // Get grades
      const grades = await pool.query(`
        SELECT * FROM grades 
        WHERE student_id = $1 AND term = $2 AND academic_year = $3
        ORDER BY subject
      `, [studentId, term, academicYear]);
      
      // Calculate summary
      const totalScore = grades.rows.reduce((sum, g) => sum + parseFloat(g.total_score), 0);
      const averageScore = grades.rows.length > 0 ? totalScore / grades.rows.length : 0;
      const { grade, grade_point, description } = this.getGradeScale(averageScore);
      
      // Get attendance summary
      let attendanceRate = 0;
      try {
        const attendance = await pool.query(`
          SELECT 
            COUNT(*) as total_days,
            SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days
          FROM attendance
          WHERE student_id = $1 AND term = $2 AND academic_year = $3
        `, [studentId, term, academicYear]);
        
        attendanceRate = attendance.rows[0].total_days > 0 
          ? (attendance.rows[0].present_days / attendance.rows[0].total_days) * 100 
          : 0;
      } catch (err) {
        // Attendance table might not exist yet
        console.log('Attendance table not found');
      }
      
      return {
        student: {
          name: `${studentInfo.rows[0].first_name} ${studentInfo.rows[0].last_name}`,
          admission_number: studentInfo.rows[0].admission_number,
          class: studentInfo.rows[0].class_name,
          level: studentInfo.rows[0].level
        },
        academic_info: {
          term: term,
          term_name: `Term ${term}`,
          academic_year: academicYear
        },
        grades: grades.rows.map(g => ({
          subject: g.subject,
          continuous_assessment: g.continuous_assessment,
          exam_score: g.exam_score,
          total_score: g.total_score,
          grade: g.grade,
          remarks: g.remarks || ''
        })),
        summary: {
          total_subjects: grades.rows.length,
          total_score: totalScore.toFixed(2),
          average_score: averageScore.toFixed(2),
          overall_grade: grade,
          grade_point: grade_point,
          attendance_rate: attendanceRate.toFixed(2),
          remarks: description
        }
      };
    } catch (error) {
      console.error('Error in generateReportCard:', error);
      throw error;
    }
  }
}

module.exports = new GradeModel();