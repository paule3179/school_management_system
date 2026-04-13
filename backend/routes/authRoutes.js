const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, hasRole, requireMFA } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-mfa', authController.verifyMFA);

// Protected routes (require authentication)
router.use(verifyToken);

router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);
router.post('/change-password', authController.changePassword);

// MFA management
router.post('/mfa/setup', authController.setupMFA);
router.post('/mfa/enable', authController.enableMFA);
router.post('/mfa/disable', authController.disableMFA);

// Admin only routes
router.get('/users', hasRole('admin'), async (req, res) => {
  const userModel = require('../models/userModel');
  const users = await userModel.getAllUsers();
  res.json({ success: true, data: users });
});

module.exports = router;