const gradeModel = require('../models/gradeModel');

const gradeController = {
  // GET /api/grades - Get all grades
  async getAllGrades(req, res) {
    try {
      const { student_id, class_id, term, academic_year, subject } = req.query;
      const filters = { student_id, class_id, term, academic_year, subject };
      
      const grades = await gradeModel.getAllGrades(filters);
      res.json({
        success: true,
        count: grades.length,
        data: grades
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/grades/:id - Get single grade
  async getGradeById(req, res) {
    try {
      const grade = await gradeModel.getGradeById(req.params.id);
      if (!grade) {
        return res.status(404).json({
          success: false,
          error: 'Grade record not found'
        });
      }
      res.json({
        success: true,
        data: grade
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/grades - Create grade
  async createGrade(req, res) {
    try {
      const required = ['student_id', 'subject', 'term', 'academic_year', 'continuous_assessment', 'exam_score'];
      const missing = required.filter(field => !req.body[field]);
      
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`
        });
      }
      
      // Calculate total score
      const total_score = (req.body.continuous_assessment + req.body.exam_score) / 2;
      
      const gradeData = {
        ...req.body,
        total_score
      };
      
      const newGrade = await gradeModel.createGrade(gradeData);
      res.status(201).json({
        success: true,
        data: newGrade
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // PUT /api/grades/:id - Update grade
  async updateGrade(req, res) {
    try {
      const updatedGrade = await gradeModel.updateGrade(req.params.id, req.body);
      if (!updatedGrade) {
        return res.status(404).json({
          success: false,
          error: 'Grade record not found'
        });
      }
      res.json({
        success: true,
        data: updatedGrade
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // DELETE /api/grades/:id - Delete grade
  async deleteGrade(req, res) {
    try {
      const deleted = await gradeModel.deleteGrade(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Grade record not found'
        });
      }
      res.json({
        success: true,
        message: 'Grade record deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/grades/report-card/:studentId - Get student report card
  async getStudentReportCard(req, res) {
    try {
      const { studentId } = req.params;
      const { term, academic_year } = req.query;
      
      if (!term || !academic_year) {
        return res.status(400).json({
          success: false,
          error: 'Term and academic year are required'
        });
      }
      
      const reportCard = await gradeModel.getStudentReportCard(studentId, parseInt(term), academic_year);
      if (!reportCard) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }
      
      res.json({
        success: true,
        data: reportCard
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/grades/class-performance/:classId - Get class performance
  async getClassPerformance(req, res) {
    try {
      const { classId } = req.params;
      const { term, academic_year } = req.query;
      
      if (!term || !academic_year) {
        return res.status(400).json({
          success: false,
          error: 'Term and academic year are required'
        });
      }
      
      const performance = await gradeModel.getClassPerformance(classId, parseInt(term), academic_year);
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = gradeController;