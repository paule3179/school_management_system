const express = require('express');
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
router.use(verifyToken);

router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, phone, role, status, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Unable to load user profile:', error.message);
    res.status(500).json({ success: false, error: 'Unable to load profile' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body || {};
    if (!first_name?.trim() || !last_name?.trim()) {
      return res.status(400).json({ success: false, error: 'First and last name are required' });
    }

    const result = await pool.query(
      `UPDATE users
       SET first_name = $1, last_name = $2, phone = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, first_name, last_name, phone, role, status`,
      [first_name.trim(), last_name.trim(), phone?.trim() || null, req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Unable to update user profile:', error.message);
    res.status(500).json({ success: false, error: 'Unable to update profile' });
  }
});

module.exports = router;
