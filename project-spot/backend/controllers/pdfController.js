const Pdf = require('../models/Pdf');
const fs = require('fs');
const path = require('path');

// Upload a PDF file
exports.uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Create a new PDF document
    const pdf = new Pdf({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      owner: req.user._id
    });

    // Generate share token
    pdf.generateShareToken();

    await pdf.save();

    res.status(201).json({
      message: 'PDF uploaded successfully',
      pdf: {
        id: pdf._id,
        filename: pdf.originalName,
        shareToken: pdf.shareToken,
        createdAt: pdf.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all PDFs owned by the authenticated user
exports.getUserPdfs = async (req, res) => {
  try {
    const pdfs = await Pdf.find({ owner: req.user._id }).sort('-createdAt');

    res.json({
      pdfs: pdfs.map(pdf => ({
        id: pdf._id,
        filename: pdf.originalName,
        shareToken: pdf.shareToken,
        createdAt: pdf.createdAt,
        sharedWith: pdf.sharedWith
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single PDF by ID (for authenticated owner)
exports.getPdfById = async (req, res) => {
  try {
    const pdf = await Pdf.findOne({
      _id: req.params.id,
      owner: req.user._id
    });

    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found or unauthorized' });
    }

    res.json({ pdf });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a PDF by share token (for anyone with the token)
exports.getPdfByShareToken = async (req, res) => {
  try {
    // PDF is already available in req.pdf from middleware
    const pdf = req.pdf;
    
    res.json({
      pdf: {
        id: pdf._id,
        filename: pdf.originalName,
        owner: pdf.owner
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Serve PDF file content by ID or share token
exports.servePdfFile = async (req, res) => {
  try {
    let pdf;
    
    if (req.params.id) {
      // Get by ID (must be owner)
      pdf = await Pdf.findOne({
        _id: req.params.id,
        owner: req.user._id
      });
    } else if (req.pdf) {
      // Get by share token (from middleware)
      pdf = req.pdf;
    }

    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found or unauthorized' });
    }

    // Check if file exists
    if (!fs.existsSync(pdf.path)) {
      return res.status(404).json({ message: 'PDF file not found on server' });
    }

    // Send file
    res.sendFile(path.resolve(pdf.path));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Share a PDF with another user by email
exports.sharePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, accessType = 'view' } = req.body;

    // Find PDF
    const pdf = await Pdf.findOne({
      _id: id,
      owner: req.user._id
    });

    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found or unauthorized' });
    }

    // Check if already shared with this email
    const alreadyShared = pdf.sharedWith.find(share => share.email === email);
    if (alreadyShared) {
      // Update access type if different
      if (alreadyShared.accessType !== accessType) {
        alreadyShared.accessType = accessType;
        await pdf.save();
      }
    } else {
      // Add new share
      pdf.sharedWith.push({ email, accessType });
      await pdf.save();
    }

    res.json({
      message: 'PDF shared successfully',
      shareToken: pdf.shareToken,
      shareLink: `${process.env.FRONTEND_URL}/shared/${pdf.shareToken}`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a PDF
exports.deletePdf = async (req, res) => {
  try {
    const { id } = req.params;

    // Find PDF
    const pdf = await Pdf.findOne({
      _id: id,
      owner: req.user._id
    });

    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found or unauthorized' });
    }

    // Delete file from filesystem
    if (fs.existsSync(pdf.path)) {
      fs.unlinkSync(pdf.path);
    }

    // Delete from database
    await Pdf.deleteOne({ _id: id });

    res.json({ message: 'PDF deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 