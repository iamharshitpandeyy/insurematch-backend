const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { sendVerificationEmail, sendWelcomeEmail, sendInvitationEmail } = require('../utils/emailService');

/**
 * Generate JWT access token
 * @param {string} userId - User ID
 * @returns {string} - JWT access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
};

/**
 * Generate JWT token (legacy - for backward compatibility)
 * @param {string} userId - User ID
 * @returns {string} - JWT token
 */
const generateToken = (userId) => {
  return generateAccessToken(userId);
};

/**
 * Register a new user
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, name, dateOfBirth } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      name,
      dateOfBirth: new Date(dateOfBirth),
      isEmailVerified: false
    });

    // Generate verification code
    const verificationCode = user.generateVerificationCode();

    // Save user
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationCode);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Continue with registration even if email fails
    }

    // Return success response (don't send token yet - user needs to verify email)
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email for a verification code.',
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred during registration. Please try again.'
    });
  }
};

/**
 * Verify email with verification code
 * POST /api/auth/verify-email
 */
const verifyEmail = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, verificationCode } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Verify the code
    if (!user.verifyCode(verificationCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code'
      });
    }

    // Mark email as verified and clear verification code
    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue even if welcome email fails
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Return success response with token
    res.status(200).json({
      success: true,
      message: 'Email verified successfully!',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          dateOfBirth: user.dateOfBirth,
          isEmailVerified: user.isEmailVerified,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);

    res.status(500).json({
      success: false,
      message: 'An error occurred during email verification. Please try again.'
    });
  }
};

/**
 * Resend verification code
 * POST /api/auth/resend-verification
 */
const resendVerification = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification code
    const verificationCode = user.generateVerificationCode();
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(user.email, user.name, verificationCode);
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Verification code has been resent to your email'
    });
  } catch (error) {
    console.error('Resend verification error:', error);

    res.status(500).json({
      success: false,
      message: 'An error occurred while resending verification code. Please try again.'
    });
  }
};

/**
 * Create a Platform Admin account
 * POST /api/auth/admin/create-platform-admin
 */
const createPlatformAdmin = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create new platform admin
    const admin = new User({
      email: email.toLowerCase(),
      password,
      name,
      role: 'platform_admin',
      isEmailVerified: true, // Platform admins are pre-verified
      dateOfBirth: new Date('1990-01-01') // Placeholder date for admin accounts
    });

    await admin.save();

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Platform Admin account created successfully',
      data: {
        userId: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Create Platform Admin error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while creating the Platform Admin account'
    });
  }
};

/**
 * Invite an Insurer Admin
 * POST /api/auth/admin/invite-insurer-admin
 */
const inviteInsurerAdmin = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, name, insurerId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create new insurer admin with pending status
    const insurerAdmin = new User({
      email: email.toLowerCase(),
      password: Math.random().toString(36).slice(-16), // Temporary password
      name,
      role: 'insurer_admin',
      isEmailVerified: false,
      dateOfBirth: new Date('1990-01-01'), // Placeholder date for admin accounts
      insurerId: insurerId || null
    });

    // Generate invitation token
    const invitationToken = insurerAdmin.generateInvitationToken();
    await insurerAdmin.save();

    // Generate invitation link
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${invitationToken}&email=${encodeURIComponent(email)}`;

    // Send invitation email
    try {
      await sendInvitationEmail(email, name, invitationLink, 'Insurer Admin');
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully to Insurer Admin',
      data: {
        userId: insurerAdmin._id,
        email: insurerAdmin.email,
        name: insurerAdmin.name,
        role: insurerAdmin.role,
        invitationLink,
        expiresAt: insurerAdmin.invitationExpiresAt
      }
    });
  } catch (error) {
    console.error('Invite Insurer Admin error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while sending the invitation'
    });
  }
};

/**
 * Invite an Insurer Agent
 * POST /api/auth/admin/invite-insurer-agent
 */
const inviteInsurerAgent = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, name, insurerId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create new insurer agent with pending status
    const insurerAgent = new User({
      email: email.toLowerCase(),
      password: Math.random().toString(36).slice(-16), // Temporary password
      name,
      role: 'insurer_agent',
      isEmailVerified: false,
      dateOfBirth: new Date('1990-01-01'), // Placeholder date for agent accounts
      insurerId: insurerId || null
    });

    // Generate invitation token
    const invitationToken = insurerAgent.generateInvitationToken();
    await insurerAgent.save();

    // Generate invitation link
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${invitationToken}&email=${encodeURIComponent(email)}`;

    // Send invitation email
    try {
      await sendInvitationEmail(email, name, invitationLink, 'Insurer Agent');
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully to Insurer Agent',
      data: {
        userId: insurerAgent._id,
        email: insurerAgent.email,
        name: insurerAgent.name,
        role: insurerAgent.role,
        invitationLink,
        expiresAt: insurerAgent.invitationExpiresAt
      }
    });
  } catch (error) {
    console.error('Invite Insurer Agent error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while sending the invitation'
    });
  }
};

/**
 * Accept invitation and set password
 * POST /api/auth/accept-invitation
 */
const acceptInvitation = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, token, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if invitation token is valid
    if (!user.verifyInvitationToken(token)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation link. Invitation links expire after 48 hours.'
      });
    }

    // Update password and activate account
    user.password = password;
    user.isEmailVerified = true;
    user.invitationToken = null;
    user.invitationExpiresAt = null;
    await user.save();

    // Generate JWT token
    const authToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully! Your account is now active.',
      data: {
        token: authToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }
      }
    });
  } catch (error) {
    console.error('Accept invitation error:', error);

    res.status(500).json({
      success: false,
      message: 'An error occurred while accepting the invitation'
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in',
        requiresVerification: true
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate access token (short expiration: 15 minutes)
    const accessToken = generateAccessToken(user._id);

    // Generate refresh token (long expiration: 7 days)
    const refreshToken = user.generateRefreshToken();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          dateOfBirth: user.dateOfBirth,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      message: 'An error occurred during login. Please try again.'
    });
  }
};

/**
 * Refresh access token using refresh token
 * POST /api/auth/refresh-token
 */
const refreshToken = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { refreshToken: token } = req.body;

    // Decode the refresh token to get user ID without verification
    // We'll verify it against the stored token in the database
    let userId;
    try {
      // We'll need to find the user by searching for the token
      const user = await User.findOne({
        refreshToken: token,
        refreshTokenExpires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      userId = user._id;

      // Verify the refresh token
      if (!user.verifyRefreshToken(token)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user._id);

      // Rotate refresh token (generate new refresh token)
      const newRefreshToken = user.generateRefreshToken();
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }
  } catch (error) {
    console.error('Token refresh error:', error);

    res.status(500).json({
      success: false,
      message: 'An error occurred while refreshing token. Please try again.'
    });
  }
};

/**
 * Logout user (invalidate refresh token)
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // req.user is set by the authenticate middleware
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Clear refresh token
    user.clearRefreshToken();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);

    res.status(500).json({
      success: false,
      message: 'An error occurred during logout. Please try again.'
    });
  }
};

/**
 * Extend session using refresh token
 * POST /api/auth/extend-session
 * This is essentially an alias for refresh-token but with clearer intent
 */
const extendSession = async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { refreshToken: token } = req.body;

    // Find user by refresh token
    try {
      const user = await User.findOne({
        refreshToken: token,
        refreshTokenExpires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token. Please login again.'
        });
      }

      // Verify the refresh token
      if (!user.verifyRefreshToken(token)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token. Please login again.'
        });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(user._id);

      // Rotate refresh token (generate new refresh token)
      const newRefreshToken = user.generateRefreshToken();
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Session extended successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      });
    } catch (error) {
      console.error('Session extension error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please login again.'
      });
    }
  } catch (error) {
    console.error('Session extension error:', error);

    res.status(500).json({
      success: false,
      message: 'An error occurred while extending session. Please try again.'
    });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerification,
  createPlatformAdmin,
  inviteInsurerAdmin,
  inviteInsurerAgent,
  acceptInvitation,
  login,
  refreshToken,
  logout,
  extendSession
};
