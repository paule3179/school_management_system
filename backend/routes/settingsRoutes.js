// backend/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const { isAdmin } = require('../middleware/auth');
const pool = require('../config/database'); // ← ADD THIS LINE - import pool

// Get term settings
router.get('/term', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT term1_total_days, term2_total_days, term3_total_days, academic_year 
      FROM term_settings 
      WHERE id = 1
    `);
    
    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        success: true,
        data: {
          term1_total_days: 60,
          term2_total_days: 60,
          term3_total_days: 45,
          academic_year: '2024-2025'
        }
      });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error getting term settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save term settings
router.post('/term', isAdmin, async (req, res) => {
  try {
    const { term1_total_days, term2_total_days, term3_total_days, academic_year } = req.body;
    
    // Check if settings exist
    const checkResult = await pool.query('SELECT id FROM term_settings WHERE id = 1');
    
    if (checkResult.rows.length === 0) {
      // Insert new settings
      await pool.query(`
        INSERT INTO term_settings (id, term1_total_days, term2_total_days, term3_total_days, academic_year)
        VALUES (1, $1, $2, $3, $4)
      `, [term1_total_days, term2_total_days, term3_total_days, academic_year]);
    } else {
      // Update existing settings
      await pool.query(`
        UPDATE term_settings 
        SET term1_total_days = $1, term2_total_days = $2, term3_total_days = $3, academic_year = $4, updated_at = NOW()
        WHERE id = 1
      `, [term1_total_days, term2_total_days, term3_total_days, academic_year]);
    }
    
    res.json({ success: true, message: 'Term settings saved successfully' });
  } catch (error) {
    console.error('Error saving term settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
