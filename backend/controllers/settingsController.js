const settingsModel = require('../models/settingsModel');

const settingsController = {
  // GET /api/settings - Get all school settings
  async getSettings(req, res) {
    try {
      const settings = await settingsModel.getSettings();
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error getting settings:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/settings - Update school settings
  async updateSettings(req, res) {
    try {
      const settings = await settingsModel.updateSettings(req.body);
      res.json({
        success: true,
        data: settings,
        message: 'School settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating settings:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/settings/currency - Get currency info only
  async getCurrency(req, res) {
    try {
      const currency = await settingsModel.getCurrency();
      res.json({
        success: true,
        data: currency
      });
    } catch (error) {
      console.error('Error getting currency:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = settingsController;
