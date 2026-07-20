const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class AuthModel {
  // Find user by email
  async findUserByEmail(email) {
    const result = await pool.query(`
      SELECT id, email, password, first_name, last_name, role, phone, 
             mfa_enabled, mfa_secret, status, last_login, created_at, updated_at
      FROM users WHERE email = $1 AND status = 'active'
    `, [email]);
    return result.rows[0];
  }

  // Find user by ID
  async findUserById(id) {
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, role, phone, 
             mfa_enabled, status, last_login
      FROM users WHERE id = $1
    `, [id]);
    return result.rows[0];
  }

  // Create new user
  async createUser(userData) {
    const { email, password, role, first_name, last_name, phone } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
      INSERT INTO users (email, password, role, first_name, last_name, phone, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING id, email, role, first_name, last_name, phone
    `, [email, hashedPassword, role, first_name, last_name, phone]);
    
    return result.rows[0];
  }

  // Update last login
  async updateLastLogin(userId) {
    await pool.query(`
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1
    `, [userId]);
  }

  // Change password
  async changePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(`
      UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
    `, [hashedPassword, userId]);
  }

  // Verify password
  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Get users by role
  async getUsersByRole(role) {
    const result = await pool.query(`
      SELECT id, email, role, first_name, last_name, phone, status, last_login
      FROM users WHERE role = $1 ORDER BY first_name
    `, [role]);
    return result.rows;
  }

  // Get all users
  async getAllUsers() {
    const result = await pool.query(`
      SELECT id, email, role, first_name, last_name, phone, status, last_login, created_at
      FROM users ORDER BY created_at DESC
    `);
    return result.rows;
  }

  // Toggle user status
  async toggleUserStatus(userId, status) {
    const result = await pool.query(`
      UPDATE users SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 RETURNING id, email, role, status
    `, [status ? 'active' : 'inactive', userId]);
    return result.rows[0];
  }

  // Enable/Disable MFA
  async updateMFA(userId, mfaEnabled, mfaSecret = null) {
    const result = await pool.query(`
      UPDATE users SET mfa_enabled = $1, mfa_secret = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 RETURNING id, mfa_enabled
    `, [mfaEnabled, mfaSecret, userId]);
    return result.rows[0];
  }
}

module.exports = new AuthModel();