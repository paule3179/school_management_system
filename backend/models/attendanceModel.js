const pool = require('../config/database');

class AttendanceModel {
  // Mark attendance for a class
  async markClassAttendance(classId, date, attendanceList, term, academicYear) {
    const results = [];
    
    for (const record of attendanceList) {
      const { student_id, status, remarks } = record;
      
      // Check if attendance already exists for this student on this date
      const existing = await pool.query(`
        SELECT id FROM attendance 
        WHERE student_id = $1 AND date = $2
      `, [student_id, date]);
      
      if (existing.rows.length > 0) {
        // Update existing record
        const result = await pool.query(`
          UPDATE attendance 
          SET status = $1, 
              remarks = $2,
              term = $3,
              term_name = $4,
              academic_year = $5
          WHERE student_id = $6 AND date = $7
          RETURNING *
        `, [status, remarks, term, `Term ${term}`, academicYear, student_id, date]);
        results.push(result.rows[0]);
      } else {
        // Insert new record
        const result = await pool.query(`
          INSERT INTO attendance (student_id, date, status, remarks, term, term_name, academic_year)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [student_id, date, status, remarks, term, `Term ${term}`, academicYear]);
        results.push(result.rows[0]);
      }
    }
    
    return results;
  }

  // Get attendance for a class on a specific date
  async getClassAttendance(classId, date, term, academicYear) {
    const result = await pool.query(`
      SELECT a.*, s.first_name, s.last_name, s.admission_number
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.class_id = $1 AND a.date = $2 AND a.term = $3 AND a.academic_year = $4
      ORDER BY s.last_name
    `, [classId, date, term, academicYear]);
    
    return result.rows;
  }

  // Get attendance summary for a student
  async getStudentAttendanceSummary(studentId, term, academicYear) {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) as excused
      FROM attendance
      WHERE student_id = $1 AND term = $2 AND academic_year = $3
    `, [studentId, term, academicYear]);
    
    const stats = result.rows[0];
    const attendanceRate = stats.total_days > 0 
      ? ((stats.present / stats.total_days) * 100).toFixed(2)
      : 0;
    
    return {
      ...stats,
      attendance_rate: attendanceRate
    };
  }

  // Get monthly attendance report for a class
  async getMonthlyAttendance(classId, month, year, term, academicYear) {
    const result = await pool.query(`
      SELECT 
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        COUNT(a.id) as days_present
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id 
        AND EXTRACT(MONTH FROM a.date) = $2 
        AND EXTRACT(YEAR FROM a.date) = $3
        AND a.status = 'present'
        AND a.term = $4
        AND a.academic_year = $5
      WHERE s.class_id = $1 AND s.status = 'active'
      GROUP BY s.id, s.first_name, s.last_name, s.admission_number
      ORDER BY s.last_name
    `, [classId, month, year, term, academicYear]);
    
    return result.rows;
  }
}

module.exports = new AttendanceModel();