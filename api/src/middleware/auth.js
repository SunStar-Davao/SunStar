const jwt = require('jsonwebtoken');

/**
 * Authenticate token middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Access token required' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ 
          success: false,
          message: 'Token expired' 
        });
      }
      return res.status(403).json({ 
        success: false,
        message: 'Invalid or expired token' 
      });
    }
    
    req.user = user;
    next();
  });
};

/**
 * Authorize guard only middleware
 */
const authorizeGuard = (req, res, next) => {
  if (req.user.role !== 'guard') {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Guard privileges required.' 
    });
  }
  next();
};

/**
 * Authorize employee only middleware
 */
const authorizeEmployee = (req, res, next) => {
  if (req.user.role !== 'employee') {
    return res.status(403).json({ 
      success: false,
      message: 'Access denied. Employee privileges required.' 
    });
  }
  next();
};

/**
 * Optional authentication (doesn't require token)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  authorizeGuard,
  authorizeEmployee,
  optionalAuth
};