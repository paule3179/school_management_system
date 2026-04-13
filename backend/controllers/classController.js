const classModel = require('../models/classModel');

const classController = {
  // GET /api/classes - Get all classes
  async getAllClasses(req, res) {
    try {
      const { level, academic_year } = req.query;
      const filters = { level, academic_year };
      
      const classes = await classModel.getAllClasses(filters);
      res.json({
        success: true,
        count: classes.length,
        data: classes
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/classes/:id - Get single class
  async getClassById(req, res) {
    try {
      const classData = await classModel.getClassById(req.params.id);
      if (!classData) {
        return res.status(404).json({
          success: false,
          error: 'Class not found'
        });
      }
      res.json({
        success: true,
        data: classData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/classes - Create class
  async createClass(req, res) {
    try {
      const required = ['name', 'level', 'capacity'];
      const missing = required.filter(field => !req.body[field]);
      
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`
        });
      }
      
      const newClass = await classModel.createClass(req.body);
      res.status(201).json({
        success: true,
        data: newClass
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // PUT /api/classes/:id - Update class
  async updateClass(req, res) {
    try {
      const updatedClass = await classModel.updateClass(req.params.id, req.body);
      if (!updatedClass) {
        return res.status(404).json({
          success: false,
          error: 'Class not found'
        });
      }
      res.json({
        success: true,
        data: updatedClass
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // DELETE /api/classes/:id - Delete class
  async deleteClass(req, res) {
    try {
      const deleted = await classModel.deleteClass(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Class not found'
        });
      }
      res.json({
        success: true,
        message: 'Class deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/classes/:id/subjects - Get class subjects
  async getClassSubjects(req, res) {
    try {
      const subjects = await classModel.getClassSubjects(req.params.id);
      if (!subjects) {
        return res.status(404).json({
          success: false,
          error: 'Class not found'
        });
      }
      res.json({
        success: true,
        data: subjects
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = classController;