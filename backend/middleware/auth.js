const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this';

// Verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No token provided. Please login first.'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired. Please login again.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid token.'
    });
  }
};

// Check if user has specific role
const hasRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }
    
    next();
  };
};

// Check if user has MFA verified
const requireMFA = (req, res, next) => {
  if (!req.user.mfa_verified && req.user.mfa_enabled) {
    return res.status(403).json({
      success: false,
      error: 'MFA verification required'
    });
  }
  next();
};

// Check resource ownership (for parent/student accessing their own data)
const isOwnResource = (resourceUserId) => {
  return (req, res, next) => {
    if (req.user.role === 'admin') {
      return next();
    }
    
    if (req.user.id !== parseInt(resourceUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own resources.'
      });
    }
    
    next();
  };
};

module.exports = {
  verifyToken,
  hasRole,
  requireMFA,
  isOwnResource
};