const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes that require authentication
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by id
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};

// Middleware to verify shared PDF access
exports.verifyShareToken = async (req, res, next) => {
  try {
    const { shareToken } = req.params;
    const Pdf = require('../models/Pdf');
    
    // Find PDF by share token
    const pdf = await Pdf.findOne({ shareToken });
    
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found or invalid share token' });
    }

    // Add PDF to request object
    req.pdf = pdf;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 