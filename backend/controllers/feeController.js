const feeModel = require('../models/feeModel');

const feeController = {
  // GET /api/fees - Get all fees
  async getAllFees(req, res) {
    try {
      const filters = req.query;
      const fees = await feeModel.getAllFees(filters);
      res.json({
        success: true,
        count: fees.length,
        data: fees
      });
    } catch (error) {
      console.error('Error getting fees:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/fees/student/:studentId - Get student fee summary
  async getStudentFeeSummary(req, res) {
    try {
      const { studentId } = req.params;
      const { academic_year } = req.query;
      
      if (!academic_year) {
        return res.status(400).json({
          success: false,
          error: 'Academic year is required'
        });
      }
      
      const summary = await feeModel.getStudentFeeSummary(studentId, academic_year);
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting student fee summary:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/fees/class/:classId - Get class fee summary
  async getClassFeeSummary(req, res) {
    try {
      const { classId } = req.params;
      const { term, academic_year } = req.query;
      
      if (!term || !academic_year) {
        return res.status(400).json({
          success: false,
          error: 'Term and academic year are required'
        });
      }
      
      const summary = await feeModel.getClassFeeSummary(classId, term, academic_year);
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting class fee summary:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/fees/payment - Record payment
  async recordPayment(req, res) {
    try {
      const payment = await feeModel.recordPayment(req.body);
      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment recorded successfully'
      });
    } catch (error) {
      console.error('Error recording payment:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/fees/types - Get fee types
  async getFeeTypes(req, res) {
    try {
      const types = await feeModel.getFeeTypes();
      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      console.error('Error getting fee types:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/fees/school-summary - Get school fee summary
  async getSchoolFeeSummary(req, res) {
    try {
      const { academic_year } = req.query;
      
      if (!academic_year) {
        return res.status(400).json({
          success: false,
          error: 'Academic year is required'
        });
      }
      
      const summary = await feeModel.getSchoolFeeSummary(academic_year);
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting school fee summary:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/fees/receipt/:feeId - Generate receipt
  async generateReceipt(req, res) {
    try {
      const { feeId } = req.params;
      const receipt = await feeModel.generateReceipt(feeId);
      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }
      res.json({
        success: true,
        data: receipt
      });
    } catch (error) {
      console.error('Error generating receipt:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = feeController;