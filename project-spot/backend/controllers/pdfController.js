const Pdf = require('../models/Pdf');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Environment variables
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
  port: process.env.EMAIL_PORT || 2525,
  auth: {
    user: process.env.EMAIL_USER || 'your-email-user',
    pass: process.env.EMAIL_PASS || 'your-email-password'
  }
});

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
        createdAt: pdf.createdAt,
        sharedWith: pdf.sharedWith || []
      }
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ message: 'Error uploading PDF' });
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
    console.error('Error fetching user PDFs:', error);
    res.status(500).json({ message: 'Error fetching PDFs' });
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
      return res.status(404).json({ message: 'PDF not found' });
    }

    res.json({
      pdf: {
        id: pdf._id,
        filename: pdf.originalName,
        createdAt: pdf.createdAt,
        shareToken: pdf.shareToken,
        sharedWith: pdf.sharedWith || []
      }
    });
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).json({ message: 'Error fetching PDF' });
  }
};

// Get a PDF by share token (for anyone with the token)
exports.getPdfByShareToken = async (req, res) => {
  try {
    const pdf = await Pdf.findOne({ shareToken: req.params.shareToken });
    
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    
    res.json({
      pdf: {
        id: pdf._id,
        filename: pdf.originalName,
        createdAt: pdf.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching shared PDF:', error);
    res.status(500).json({ message: 'Error fetching PDF' });
  }
};

// Serve PDF file content by ID or share token
exports.servePdfFile = async (req, res) => {
  try {
    let pdf;
    
    if (req.params.shareToken) {
      // Access via share token
      pdf = await Pdf.findOne({ shareToken: req.params.shareToken });
    } else {
      // Access via ID (must be owner)
      pdf = await Pdf.findOne({ _id: req.params.id, owner: req.user._id });
    }

    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    const filePath = path.resolve(pdf.path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }
    
    res.contentType('application/pdf');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Error serving PDF file:', error);
    res.status(500).json({ message: 'Error serving PDF file' });
  }
};

// Share a PDF with another user by email
exports.sharePdf = async (req, res) => {
  try {
    const { email, accessType = 'view' } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    const pdf = await Pdf.findOne({ _id: req.params.id, owner: req.user._id });
    
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    
    // Generate a share token if one doesn't exist
    if (!pdf.shareToken) {
      pdf.generateShareToken();
    }
    
    // Check if already shared with this email
    const alreadyShared = pdf.sharedWith.find(share => share.email === email);
    
    if (!alreadyShared) {
      pdf.sharedWith.push({ email, accessType });
    } else {
      // Update access type if already shared
      alreadyShared.accessType = accessType;
    }
    
    await pdf.save();
    
    // Create share link
    const shareLink = `${FRONTEND_URL}/shared/${pdf.shareToken}`;
    
    // Send email notification
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@pdfapp.com',
        to: email,
        subject: 'PDF Shared With You',
        html: `
          <h1>A PDF has been shared with you</h1>
          <p>${req.user.name} has shared a PDF titled "${pdf.originalName}" with you.</p>
          <p>Click the link below to view the document:</p>
          <a href="${shareLink}">View PDF</a>
          <p>This link gives you ${accessType} access to the document.</p>
        `
      });
    } catch (emailError) {
      console.error('Error sending share notification email:', emailError);
      // Continue with the response even if email fails
    }
    
    res.json({
      message: 'PDF shared successfully',
      shareToken: pdf.shareToken,
      shareLink
    });
  } catch (error) {
    console.error('Error sharing PDF:', error);
    res.status(500).json({ message: 'Error sharing PDF' });
  }
};

// Delete a PDF
exports.deletePdf = async (req, res) => {
  try {
    const pdf = await Pdf.findOne({ _id: req.params.id, owner: req.user._id });
    
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    
    // Delete the file from the filesystem
    const filePath = path.resolve(pdf.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete the database entry
    await Pdf.deleteOne({ _id: pdf._id });
    
    res.json({ message: 'PDF deleted successfully' });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ message: 'Error deleting PDF' });
  }
}; 