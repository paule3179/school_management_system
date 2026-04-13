const parentModel = require('../models/parentModel');

const parentController = {
  // GET /api/parents - Get all parents
  async getAllParents(req, res) {
    try {
      const parents = await parentModel.getAllParents();
      res.json({
        success: true,
        count: parents.length,
        data: parents
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/parents/:id - Get single parent
  async getParentById(req, res) {
    try {
      const parent = await parentModel.getParentById(req.params.id);
      if (!parent) {
        return res.status(404).json({
          success: false,
          error: 'Parent not found'
        });
      }
      res.json({
        success: true,
        data: parent
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/parents - Create parent
  async createParent(req, res) {
    try {
      const required = ['first_name', 'last_name', 'phone', 'email'];
      const missing = required.filter(field => !req.body[field]);
      
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`
        });
      }
      
      const newParent = await parentModel.createParent(req.body);
      res.status(201).json({
        success: true,
        data: newParent
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // PUT /api/parents/:id - Update parent
  async updateParent(req, res) {
    try {
      const updatedParent = await parentModel.updateParent(req.params.id, req.body);
      if (!updatedParent) {
        return res.status(404).json({
          success: false,
          error: 'Parent not found'
        });
      }
      res.json({
        success: true,
        data: updatedParent
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // DELETE /api/parents/:id - Delete parent
  async deleteParent(req, res) {
    try {
      const deleted = await parentModel.deleteParent(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Parent not found'
        });
      }
      res.json({
        success: true,
        message: 'Parent deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/parents/:id/dashboard - Get parent dashboard
  async getParentDashboard(req, res) {
    try {
      const dashboard = await parentModel.getParentDashboard(req.params.id);
      if (!dashboard) {
        return res.status(404).json({
          success: false,
          error: 'Parent not found'
        });
      }
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = parentController;