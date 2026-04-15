const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// Get term settings
router.get('/term', async (req, res) => {
  try {
    // Create term_settings table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS term_settings (
        id SERIAL PRIMARY KEY,
        term1_total_days INT DEFAULT 60,
        term2_total_days INT DEFAULT 60,
        term3_total_days INT DEFAULT 45,
        academic_year VARCHAR(20) DEFAULT '2024-2025',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const result = await pool.query(`
      SELECT * FROM term_settings 
      ORDER BY id DESC LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      // Insert default settings
      const insertResult = await pool.query(`
        INSERT INTO term_settings (term1_total_days, term2_total_days, term3_total_days, academic_year)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [60, 60, 45, '2024-2025']);
      
      return res.json({ success: true, data: insertResult.rows[0] });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error getting term settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== NEW CURRENCY SETTINGS ENDPOINTS =====
router.get('/settings', settingsController.getSettings);
router.post('/settings', settingsController.updateSettings);
router.get('/settings/currency', settingsController.getCurrency);

// ===== EXISTING TERM SETTINGS (keep for compatibility) =====

module.exports = router;
