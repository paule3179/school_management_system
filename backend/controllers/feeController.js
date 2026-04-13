const feeModel = require('../models/feeModel');

const feeController = {
  // GET /api/fees - Get all fees
  async getAllFees(req, res) {
    try {
      const { student_id, status, term, academic_year } = req.query;
      const filters = { student_id, status, term, academic_year };
      
      const fees = await feeModel.getAllFees(filters);
      res.json({ success: true, count: fees.length, data: fees });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/fees/:id - Get single fee
  async getFeeById(req, res) {
    try {
      const fee = await feeModel.getFeeById(req.params.id);
      if (!fee) {
        return res.status(404).json({ success: false, error: 'Fee record not found' });
      }
      res.json({ success: true, data: fee });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/fees/student/:studentId/summary - Get student fee summary
  async getStudentFeeSummary(req, res) {
    try {
      const { studentId } = req.params;
      const { academic_year } = req.query;
      
      if (!academic_year) {
        return res.status(400).json({ success: false, error: 'Academic year is required' });
      }
      
      const summary = await feeModel.getStudentFeeSummary(studentId, academic_year);
      if (!summary) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }
      res.json({ success: true, data: summary });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/fees/payment - Record payment
  async recordPayment(req, res) {
    try {
      const payment = await feeModel.recordPayment(req.body);
      res.status(201).json({ success: true, data: payment });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/fees/types - Get fee types
  async getFeeTypes(req, res) {
    try {
      const types = await feeModel.getFeeTypes();
      res.json({ success: true, data: types });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/fees/school-summary - Get school fee summary
  async getSchoolFeeSummary(req, res) {
    try {
      const { academic_year } = req.query;
      if (!academic_year) {
        return res.status(400).json({ success: false, error: 'Academic year is required' });
      }
      
      const summary = await feeModel.getSchoolFeeSummary(academic_year);
      res.json({ success: true, data: summary });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = feeController;