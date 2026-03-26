const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendSessionExpiryWarningEmail } = require('../utils/emailService');

/**
 * Middleware to check if session is about to expire and send warning
 * This middleware should be applied to protected routes where you want to warn users
 */
const checkSessionExpiry = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Only check if authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    // Decode token without verification to check expiry
    const decoded = jwt.decode(token);

    if (!decoded || !decoded.exp) {
      return next();
    }

    // Calculate time until expiration (in seconds)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - currentTime;

    // Check if token expires within 5 minutes (300 seconds)
    const warningThreshold = 5 * 60; // 5 minutes in seconds

    if (timeUntilExpiry > 0 && timeUntilExpiry <= warningThreshold) {
      // Set warning header
      res.setHeader('X-Session-Expiry-Warning', 'true');
      res.setHeader('X-Session-Expires-In', timeUntilExpiry.toString());

      // Get user from database to send email warning
      try {
        const user = await User.findById(decoded.userId).select('email name');

        if (user) {
          // Send email warning (non-blocking)
          sendSessionExpiryWarningEmail(user.email, user.name, timeUntilExpiry)
            .catch(error => {
              console.error('Failed to send session expiry warning email:', error);
              // Don't fail the request if email fails
            });
        }
      } catch (error) {
        console.error('Error fetching user for session warning:', error);
        // Continue with the request even if we can't send email
      }
    }

    next();
  } catch (error) {
    // Don't fail the request if session check fails
    console.error('Session expiry check error:', error);
    next();
  }
};

/**
 * Middleware to authenticate users using JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred during authentication.'
    });
  }
};

/**
 * Middleware to check if user has required role(s)
 * @param  {...string} allowedRoles - Roles that are allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  checkSessionExpiry
};
