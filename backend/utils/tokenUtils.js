const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

// Generate access token (JWT)
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

// Generate random refresh token
const generateRandomRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Store refresh token in database
const storeRefreshToken = async (userId, token, expiresAt, userAgent, ipAddress) => {
  // Revoke existing tokens for this user (single session)
  await pool.query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
    [userId]
  );
  
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, token, expiresAt, userAgent, ipAddress]
  );
};

// Verify refresh token from database
const verifyRefreshToken = async (token, userAgent, ipAddress) => {
  const result = await pool.query(
    `SELECT * FROM refresh_tokens 
     WHERE token = $1 AND revoked = FALSE AND expires_at > NOW()`,
    [token]
  );
  
  if (result.rows.length === 0) return null;
  
  const refreshToken = result.rows[0];
  
  if (refreshToken.user_agent !== userAgent || refreshToken.ip_address !== ipAddress) {
    console.warn(`Suspicious refresh token usage for user ${refreshToken.user_id}`);
  }
  
  return refreshToken;
};

// Revoke refresh token
const revokeRefreshToken = async (token) => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1`,
    [token]
  );
};

// Revoke all user refresh tokens
const revokeAllUserRefreshTokens = async (userId) => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
    [userId]
  );
};

module.exports = {
  generateAccessToken,
  generateRandomRefreshToken,
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  ACCESS_TOKEN_EXPIRY
};