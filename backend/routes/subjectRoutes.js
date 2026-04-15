const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY level, name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get subjects by level
router.get('/level/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const result = await pool.query('SELECT * FROM subjects WHERE level = $1 ORDER BY name', [level]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching subjects by level:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;