const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const pdfController = require('../controllers/pdfController');
const { authenticate, verifyShareToken } = require('../middleware/auth');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// File filter to allow only PDFs
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes for authenticated users
router.post('/upload', authenticate, upload.single('file'), pdfController.uploadPdf);
router.get('/my-pdfs', authenticate, pdfController.getUserPdfs);
router.get('/pdf/:id', authenticate, pdfController.getPdfById);
router.get('/pdf/:id/file', authenticate, pdfController.servePdfFile);
router.post('/pdf/:id/share', authenticate, pdfController.sharePdf);
router.delete('/pdf/:id', authenticate, pdfController.deletePdf);

// Routes for shared PDFs (access via share token)
router.get('/shared/:shareToken', verifyShareToken, pdfController.getPdfByShareToken);
router.get('/shared/:shareToken/file', verifyShareToken, pdfController.servePdfFile);

module.exports = router; 