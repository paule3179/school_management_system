const inventoryModel = require('../models/inventoryModel');

const inventoryController = {
  // GET /api/inventory - Get all items
  async getAllItems(req, res) {
    try {
      const { category, status, condition } = req.query;
      const filters = { category, status, condition };
      
      const items = await inventoryModel.getAllItems(filters);
      res.json({ success: true, count: items.length, data: items });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/inventory/summary - Get inventory summary
  async getInventorySummary(req, res) {
    try {
      const summary = await inventoryModel.getInventorySummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/inventory/alerts - Get low stock alerts
  async getLowStockAlerts(req, res) {
    try {
      const alerts = await inventoryModel.getLowStockAlerts();
      res.json({ success: true, count: alerts.length, data: alerts });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/inventory/categories - Get categories
  async getInventoryCategories(req, res) {
    try {
      const categories = await inventoryModel.getInventoryCategories();
      res.json({ success: true, data: categories });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/inventory/search/:keyword - Search inventory
  async searchInventory(req, res) {
    try {
      const items = await inventoryModel.searchInventory(req.params.keyword);
      res.json({ success: true, count: items.length, data: items });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // GET /api/inventory/:id - Get single item
  async getItemById(req, res) {
    try {
      const item = await inventoryModel.getItemById(req.params.id);
      if (!item) {
        return res.status(404).json({ success: false, error: 'Item not found' });
      }
      res.json({ success: true, data: item });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/inventory - Create item
  async createItem(req, res) {
    try {
      const newItem = await inventoryModel.createItem(req.body);
      res.status(201).json({ success: true, data: newItem });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/inventory/:id - Update item
  async updateItem(req, res) {
    try {
      const updated = await inventoryModel.updateItem(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Item not found' });
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // DELETE /api/inventory/:id - Delete item
  async deleteItem(req, res) {
    try {
      const deleted = await inventoryModel.deleteItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Item not found' });
      }
      res.json({ success: true, message: 'Item deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // POST /api/inventory/transaction - Record transaction
  async recordTransaction(req, res) {
    try {
      const transaction = await inventoryModel.recordTransaction(req.body);
      res.status(201).json({ success: true, data: transaction });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // PUT /api/inventory/transaction/:transactionId/approve - Approve transaction
  async approveTransaction(req, res) {
    try {
      const approved = await inventoryModel.approveTransaction(req.params.transactionId, req.body.approved_by);
      if (!approved) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }
      res.json({ success: true, data: approved });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = inventoryController;