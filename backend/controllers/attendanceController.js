const attendanceModel = require('../models/attendanceModel');
const pool = require('../config/database');

const teacherCanAccessClass = (req, classId) => req.user?.role !== 'teacher' ||
  req.user.allowedClassIds?.includes(Number(classId)) === true;

const attendanceController = {
  async getTodaySummary(req, res) {
    try {
      const params = [];
      let classFilter = '';
      if (req.user?.role === 'teacher') {
        const classIds = req.user.allowedClassIds || [];
        if (classIds.length === 0) {
          return res.json({ success: true, data: { total: 0, present: 0, absent: 0, late: 0 } });
        }
        params.push(classIds.map(Number));
        classFilter = 'AND s.class_id = ANY($1::int[])';
      }
      const result = await pool.query(`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE LOWER(a.status) = 'present')::int AS present,
               COUNT(*) FILTER (WHERE LOWER(a.status) = 'absent')::int AS absent,
               COUNT(*) FILTER (WHERE LOWER(a.status) = 'late')::int AS late
        FROM attendance a
        JOIN students s ON s.id = a.student_id
        WHERE a.date = CURRENT_DATE ${classFilter}
      `, params);
      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Error getting today attendance summary:', error.message);
      res.status(500).json({ success: false, error: 'Unable to fetch today attendance summary' });
    }
  },

  // POST /api/attendance/class - Mark class attendance
  async markClassAttendance(req, res) {
    try {
      const { class_id, date, attendance_list, term, academic_year } = req.body;
      
      if (!Number.isInteger(Number(class_id)) || Number(class_id) <= 0 ||
          typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Array.isArray(attendance_list) || attendance_list.length === 0 ||
          !Number.isInteger(Number(term)) || Number(term) < 1 || Number(term) > 3 ||
          typeof academic_year !== 'string' || !academic_year.trim()) {
        return res.status(400).json({
          success: false,
          error: 'A valid class, date, term, academic year, and attendance list are required'
        });
      }

      if (!teacherCanAccessClass(req, class_id)) {
        return res.status(403).json({ success: false, error: 'Access denied to this class' });
      }

      const allowedStatuses = new Set(['present', 'absent', 'late', 'excused']);
      if (attendance_list.some((record) => !record || typeof record !== 'object' ||
          !allowedStatuses.has(record.status) ||
          (record.remarks !== undefined && typeof record.remarks !== 'string'))) {
        return res.status(400).json({ success: false, error: 'Attendance records contain an invalid status or remarks value' });
      }

      const studentIds = attendance_list.map(({ student_id }) => Number(student_id));
      if (studentIds.some((id) => !Number.isInteger(id) || id <= 0)) {
        return res.status(400).json({ success: false, error: 'Invalid student ID in attendance list' });
      }
      if (new Set(studentIds).size !== studentIds.length) {
        return res.status(400).json({ success: false, error: 'A student may appear only once in the attendance list' });
      }
      const studentsInClass = await pool.query(
        'SELECT id FROM students WHERE class_id = $1 AND id = ANY($2::int[])',
        [class_id, studentIds]
      );
      if (studentsInClass.rows.length !== studentIds.length) {
        return res.status(400).json({ success: false, error: 'Attendance includes a student outside this class' });
      }
      
      const results = await attendanceModel.markClassAttendance(
        class_id, date, attendance_list, term, academic_year
      );
      
      res.status(201).json({
        success: true,
        count: results.length,
        data: results,
        message: 'Attendance saved successfully'
      });
    } catch (error) {
      console.error('Error marking attendance:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/attendance/class/:classId - Get class attendance for a date
  async getClassAttendance(req, res) {
    try {
      const { classId } = req.params;
      const { date, term, academic_year } = req.query;
      
      if (!date || !term || !academic_year) {
        return res.status(400).json({
          success: false,
          error: 'Date, term, and academic year are required'
        });
      }

      // Role-based access check
      if (!teacherCanAccessClass(req, classId)) {
        return res.status(403).json({ success: false, error: 'Access denied to this class' });
      }
      
      const attendance = await attendanceModel.getClassAttendance(classId, date, term, academic_year);
      res.json({
        success: true,
        data: attendance
      });
    } catch (error) {
      console.error('Error getting attendance:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/attendance/student-summary/:studentId - Get student attendance summary
  async getStudentAttendanceSummary(req, res) {
    try {
      const { studentId } = req.params;
      const { term, academic_year } = req.query;
      
      if (!term || !academic_year) {
        return res.status(400).json({
          success: false,
          error: 'Term and academic year are required'
        });
      }

      if (req.user?.role === 'teacher') {
        const studentResult = await pool.query('SELECT class_id FROM students WHERE id = $1', [studentId]);
        if (!studentResult.rows[0] || !teacherCanAccessClass(req, studentResult.rows[0].class_id)) {
          return res.status(403).json({ success: false, error: 'Access denied to this student' });
        }
      }

      // Role-based access check
      if (req.user?.role === 'parent' && req.user.allowedStudentIds?.length > 0) {
        if (!req.user.allowedStudentIds.includes(parseInt(studentId))) {
          return res.status(403).json({ success: false, error: 'Access denied to this student' });
        }
      }
      
      const summary = await attendanceModel.getStudentAttendanceSummary(studentId, term, academic_year);
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting student summary:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/attendance/monthly/:classId - Get monthly attendance report
  async getMonthlyAttendance(req, res) {
    try {
      const { classId } = req.params;
      const { month, year, term, academic_year } = req.query;
      
      if (!month || !year || !term || !academic_year) {
        return res.status(400).json({
          success: false,
          error: 'Month, year, term, and academic year are required'
        });
      }

      // Role-based access check
      if (!teacherCanAccessClass(req, classId)) {
        return res.status(403).json({ success: false, error: 'Access denied to this class' });
      }
      
      const report = await attendanceModel.getMonthlyAttendance(classId, month, year, term, academic_year);
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Error getting monthly attendance:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = attendanceController;
