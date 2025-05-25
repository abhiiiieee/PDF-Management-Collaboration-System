const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// JWT secret from environment or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Create new user
    const user = new User({
      name,
      email,
      password
    });
    
    await user.save();
    
    // Generate JWT
    const token = generateToken(user._id);
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    
    // Generate JWT
    const token = generateToken(user._id);
    
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error while fetching user data' });
  }
};

// Request password reset
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }
    
    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();
    
    // Create reset URL
    const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;
    
    // DEBUG MODE: Instead of sending email, return token directly
    // This is ONLY for development purposes - REMOVE in production!
    console.log('DEVELOPMENT MODE: Password reset token generated');
    console.log('Reset URL:', resetUrl);
    
    // Response includes token in development mode
    if (process.env.NODE_ENV === 'production') {
      // In production, we would actually send the email
      res.status(200).json({ 
        message: 'Password reset email sent'
      });
    } else {
      // For development, return the token directly
      res.status(200).json({ 
        message: 'Password reset link generated (DEV MODE)',
        resetUrl,
        resetToken
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: 'Error processing password reset request', 
      error: error.message 
    });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    // Generate new JWT
    const newToken = generateToken(user._id);
    
    res.status(200).json({
      message: 'Password reset successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      token: newToken
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
}; 