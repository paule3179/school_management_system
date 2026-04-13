const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const userModel = require('../models/userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this';
const JWT_EXPIRES_IN = '7d';

const authController = {
  // Register new user
  async register(req, res) {
    try {
      const { email, password, first_name, last_name, role, phone } = req.body;
      
      // Check if user exists
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User already exists with this email'
        });
      }
      
      // Validate role
      const allowedRoles = ['admin', 'teacher', 'parent', 'student'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Allowed roles: admin, teacher, parent, student'
        });
      }
      
      // Create user
      const newUser = await userModel.createUser({
        email,
        password,
        first_name,
        last_name,
        role,
        phone,
        status: 'active'
      });
      
      // Generate token
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: newUser.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: { user: newUser, token }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Verify credentials
      const user = await userModel.verifyPassword(email, password);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        });
      }
      
      // Check if account is active
      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Account is disabled. Please contact administrator.'
        });
      }
      
      // Generate token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, mfa_enabled: user.mfa_enabled },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // Update last login
      await userModel.updateLastLogin(user.id);
      
      const { password: pwd, mfa_secret, ...safeUser } = user;
      
      res.json({
        success: true,
        message: user.mfa_enabled ? 'MFA required. Please verify your code.' : 'Login successful',
        data: {
          user: safeUser,
          token,
          mfa_required: user.mfa_enabled
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Verify MFA and complete login
  async verifyMFA(req, res) {
    try {
      const { email, token } = req.body;
      
      const user = await userModel.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }
      
      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: token
      });
      
      if (!verified) {
        return res.status(401).json({ success: false, error: 'Invalid MFA code' });
      }
      
      // Generate final token
      const jwtToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, mfa_verified: true },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      await userModel.updateLastLogin(user.id);
      
      const { password, mfa_secret, ...safeUser } = user;
      
      res.json({
        success: true,
        message: 'MFA verified successfully',
        data: { user: safeUser, token: jwtToken }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Setup MFA for user
  async setupMFA(req, res) {
    try {
      const userId = req.user.id; // From auth middleware
      
      const user = await userModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `SchoolMS:${user.email}`
      });
      
      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
      
      // Store secret temporarily (will be enabled after verification)
      // For now, just return the secret and QR code
      
      res.json({
        success: true,
        data: {
          secret: secret.base32,
          qr_code: qrCodeUrl,
          otpauth_url: secret.otpauth_url
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Enable MFA after verification
  async enableMFA(req, res) {
    try {
      const userId = req.user.id;
      const { secret, token } = req.body;
      
      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token
      });
      
      if (!verified) {
        return res.status(400).json({ success: false, error: 'Invalid verification code' });
      }
      
      // Enable MFA for user
      await userModel.enableMFA(userId, secret);
      
      res.json({
        success: true,
        message: 'MFA enabled successfully'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Disable MFA
  async disableMFA(req, res) {
    try {
      const userId = req.user.id;
      const { password } = req.body;
      
      const user = await userModel.getUserById(userId);
      
      // Verify password
      const isValid = await userModel.verifyPassword(user.email, password);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }
      
      await userModel.disableMFA(userId);
      
      res.json({
        success: true,
        message: 'MFA disabled successfully'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Logout
  async logout(req, res) {
    // With JWT, logout is handled client-side by removing token
    // But you can implement a blacklist if needed
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  },
  
  // Get current user
  async getCurrentUser(req, res) {
    try {
      const user = await userModel.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
  
  // Change password
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { current_password, new_password } = req.body;
      
      const user = await userModel.getUserById(userId);
      
      // Verify current password
      const isValid = await userModel.verifyPassword(user.email, current_password);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }
      
      // Update password
      await userModel.updateUser(userId, { password: new_password });
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = authController;