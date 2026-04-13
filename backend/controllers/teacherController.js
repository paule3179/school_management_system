const teacherModel = require('../models/teacherModel');

const teacherController = {
  // GET /api/teachers - Get all teachers
  async getAllTeachers(req, res) {
    try {
      const { status, subject } = req.query;
      const filters = { status, subject };
      
      const teachers = await teacherModel.getAllTeachers(filters);
      res.json({
        success: true,
        count: teachers.length,
        data: teachers
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/teachers/:id - Get single teacher
  async getTeacherById(req, res) {
    try {
      const teacher = await teacherModel.getTeacherById(req.params.id);
      if (!teacher) {
        return res.status(404).json({
          success: false,
          error: 'Teacher not found'
        });
      }
      res.json({
        success: true,
        data: teacher
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/teachers - Create teacher
  async createTeacher(req, res) {
    try {
      const required = ['first_name', 'last_name', 'email', 'phone', 'subject_specialty'];
      const missing = required.filter(field => !req.body[field]);
      
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`
        });
      }
      
      const newTeacher = await teacherModel.createTeacher(req.body);
      res.status(201).json({
        success: true,
        data: newTeacher
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // PUT /api/teachers/:id - Update teacher
  async updateTeacher(req, res) {
    try {
      const updatedTeacher = await teacherModel.updateTeacher(req.params.id, req.body);
      if (!updatedTeacher) {
        return res.status(404).json({
          success: false,
          error: 'Teacher not found'
        });
      }
      res.json({
        success: true,
        data: updatedTeacher
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // DELETE /api/teachers/:id - Delete teacher
  async deleteTeacher(req, res) {
    try {
      const deleted = await teacherModel.deleteTeacher(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Teacher not found'
        });
      }
      res.json({
        success: true,
        message: 'Teacher deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/teachers/:id/schedule - Get teacher schedule
  async getTeacherSchedule(req, res) {
    try {
      const schedule = await teacherModel.getTeacherSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({
          success: false,
          error: 'Teacher not found'
        });
      }
      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = teacherController;