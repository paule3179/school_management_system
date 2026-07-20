const feeModel = require('../models/feeModel');

const feeController = {
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

      // Role-based access check
      if (req.user?.role === 'teacher' && req.user.allowedClassIds?.length > 0) {
        if (!req.user.allowedClassIds.includes(parseInt(classId))) {
          return res.status(403).json({ success: false, error: 'Access denied to this class' });
        }
      }

      // Parents should not see class students they don't own
      // We'll enforce this by filtering allowed students at query/model level.
      // (If allowedStudentIds is not present, we treat it as no access.)
      if (req.user?.role === 'parent') {
        if (!Array.isArray(req.user.allowedStudentIds)) {
          return res.status(403).json({ success: false, error: 'Access denied' });
        }
        // If parent has no allowed students, return empty list (not 403)
        if (req.user.allowedStudentIds.length === 0) {
          return res.json({ success: true, data: [] });
        }
      }
      
      const summary = await feeModel.getClassFeeSummary(classId, parseInt(term), academic_year, req.user);
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting class fee summary:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
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

      // Role-based access check
      if (req.user?.role === 'parent' && req.user.allowedStudentIds?.length > 0) {
        if (!req.user.allowedStudentIds.includes(parseInt(studentId))) {
          return res.status(403).json({ success: false, error: 'Access denied to this student' });
        }
      }
      
      const summary = await feeModel.getStudentFeeSummary(studentId, academic_year);
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting student fee summary:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/fees/payment - Record payment
  async recordPayment(req, res) {
    try {
      // Enforce parent strict ownership: parents can only pay for their own students
      if (req.user?.role === 'parent' && Array.isArray(req.user.allowedStudentIds) && req.user.allowedStudentIds.length > 0) {
        const studentId = parseInt(req.body?.student_id);
        if (!Number.isFinite(studentId) || !req.user.allowedStudentIds.includes(studentId)) {
          return res.status(403).json({ success: false, error: 'Access denied to this student' });
        }
      }

      const payment = await feeModel.recordPayment(req.body);
      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment recorded successfully'
      });
    } catch (error) {
      console.error('Error recording payment:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
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
      res.status(500).json({
        success: false,
        error: error.message
      });
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
      res.status(500).json({
        success: false,
        error: error.message
      });
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
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/fees - Get all fees
  async getAllFees(req, res) {
    try {
      const fees = await feeModel.getAllFees(req.query);
      res.json({
        success: true,
        data: fees
      });
    } catch (error) {
      console.error('Error getting all fees:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // ============================================
  // NEW: FEE SETTINGS METHODS
  // ============================================

  // GET /api/fees/settings - Get fee settings
  async getFeeSettings(req, res) {
    try {
      const settings = await feeModel.getFeeSettings();
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error getting fee settings:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // POST /api/fees/settings - Create new fee type
  async createFeeType(req, res) {
    try {
      const { name, amount } = req.body;
      
      if (!name || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Name and amount are required'
        });
      }
      
      const newFee = await feeModel.createFeeType(name, amount);
      res.status(201).json({
        success: true,
        data: newFee,
        message: 'Fee type created successfully'
      });
    } catch (error) {
      console.error('Error creating fee type:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // PUT /api/fees/settings/:id - Update fee setting
  async updateFeeSetting(req, res) {
    try {
      const { id } = req.params;
      const { amount, name } = req.body;
      
      const updatedFee = await feeModel.updateFeeSetting(id, { amount, name });
      if (!updatedFee) {
        return res.status(404).json({
          success: false,
          error: 'Fee type not found'
        });
      }
      
      res.json({
        success: true,
        data: updatedFee,
        message: 'Fee updated successfully'
      });
    } catch (error) {
      console.error('Error updating fee setting:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // DELETE /api/fees/settings/:id - Delete fee type (soft delete)
  async deleteFeeType(req, res) {
    try {
      const { id } = req.params;
      
      const deleted = await feeModel.deleteFeeType(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Fee type not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Fee type deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting fee type:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = feeController;