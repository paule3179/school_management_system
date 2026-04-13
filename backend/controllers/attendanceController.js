const attendanceModel = require('../models/attendanceModel');

const attendanceController = {
  // GET /api/attendance - Get all attendance records
  async getAllAttendance(req, res) {
    try {
      const { student_id, class_id, date, status } = req.query;
      const filters = { student_id, class_id, date, status };
      
      const attendance = await attendanceModel.getAllAttendance(filters);
      res.json({
        success: true,
        count: attendance.length,
        data: attendance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/attendance/:id - Get single attendance record
  async getAttendanceById(req, res) {
    try {
      const attendance = await attendanceModel.getAttendanceById(req.params.id);
      if (!attendance) {
        return res.status(404).json({
          success: false,
          error: 'Attendance record not found'
        });
      }
      res.json({
        success: true,
        data: attendance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/attendance/class - Mark attendance for whole class
  async markClassAttendance(req, res) {
    try {
      const { class_id, date, attendance_list, term, term_name, academic_year } = req.body;
      
      if (!class_id || !date || !attendance_list) {
        return res.status(400).json({
          success: false,
          error: 'Class ID, date, and attendance list are required'
        });
      }
      
      const attendance = await attendanceModel.markClassAttendance(
        class_id, 
        date, 
        attendance_list,
        term,
        term_name,
        academic_year
      );
      
      res.status(201).json({
        success: true,
        count: attendance.length,
        data: attendance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/attendance/student - Mark single student attendance
  async markStudentAttendance(req, res) {
    try {
      const required = ['student_id', 'date', 'status', 'term', 'academic_year'];
      const missing = required.filter(field => !req.body[field]);
      
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`
        });
      }
      
      const attendance = await attendanceModel.markStudentAttendance(req.body);
      res.status(201).json({
        success: true,
        data: attendance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // PUT /api/attendance/:id - Update attendance record
  async updateAttendance(req, res) {
    try {
      const updatedAttendance = await attendanceModel.updateAttendance(req.params.id, req.body);
      if (!updatedAttendance) {
        return res.status(404).json({
          success: false,
          error: 'Attendance record not found'
        });
      }
      res.json({
        success: true,
        data: updatedAttendance
      });
    } catch (error) {
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
      
      const summary = await attendanceModel.getStudentAttendanceSummary(studentId, parseInt(term), academic_year);
      if (!summary) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/attendance/class-summary/:classId - Get class attendance summary
  async getClassAttendanceSummary(req, res) {
    try {
      const { classId } = req.params;
      const { start_date, end_date, term, academic_year } = req.query;
      
      if (!term || !academic_year) {
        return res.status(400).json({
          success: false,
          error: 'Term and academic year are required'
        });
      }
      
      const summary = await attendanceModel.getClassAttendanceSummary(
        classId, 
        start_date, 
        end_date, 
        parseInt(term), 
        academic_year
      );
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = attendanceController;