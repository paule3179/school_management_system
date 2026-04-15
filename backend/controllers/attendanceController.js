const attendanceModel = require('../models/attendanceModel');

const attendanceController = {
  // POST /api/attendance/class - Mark class attendance
  async markClassAttendance(req, res) {
    try {
      const { class_id, date, attendance_list, term, academic_year } = req.body;
      
      if (!class_id || !date || !attendance_list) {
        return res.status(400).json({
          success: false,
          error: 'Class ID, date, and attendance list are required'
        });
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