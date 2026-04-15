const teacherModel = require('../models/teacherModel');

const teacherController = {
  // GET /api/teachers - Get all teachers
  async getAllTeachers(req, res) {
    try {
      const { subject, status } = req.query;
      const filters = { subject, status };
      
      const teachers = await teacherModel.getAllTeachers(filters);
      res.json({
        success: true,
        count: teachers.length,
        data: teachers
      });
    } catch (error) {
      console.error('Error:', error.message);
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
      console.error('Error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/teachers - Create teacher
  async createTeacher(req, res) {
    try {
      console.log('Creating teacher with data:', req.body);
      
      const required = ['first_name', 'last_name', 'subject_specialty', 'phone', 'email'];
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
        data: newTeacher,
        message: 'Teacher created successfully'
      });
    } catch (error) {
      console.error('Error:', error.message);
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
        data: updatedTeacher,
        message: 'Teacher updated successfully'
      });
    } catch (error) {
      console.error('Error:', error.message);
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
      console.error('Error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/teachers/:id/assign-class - Assign teacher to class
  async assignToClass(req, res) {
    try {
      const { class_id } = req.body;
      const result = await teacherModel.assignToClass(req.params.id, class_id);
      res.json({
        success: true,
        data: result,
        message: 'Teacher assigned to class successfully'
      });
    } catch (error) {
      console.error('Error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/teachers/:id/schedule - Get teacher schedule
  async getTeacherSchedule(req, res) {
    try {
      const schedule = await teacherModel.getTeacherSchedule(req.params.id);
      res.json({
        success: true,
        data: schedule
      });
    } catch (error) {
      console.error('Error:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = teacherController;