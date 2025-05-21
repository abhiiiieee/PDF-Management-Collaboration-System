const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticate, verifyShareToken } = require('../middleware/auth');

// Add a comment to a PDF (authenticated users)
router.post('/pdf/:pdfId/comment', authenticate, commentController.addComment);

// Add a comment to a shared PDF (via share token)
router.post('/shared/:shareToken/comment', verifyShareToken, commentController.addComment);

// Get all comments for a PDF (authenticated users)
router.get('/pdf/:pdfId/comments', authenticate, commentController.getPdfComments);

// Get all comments for a shared PDF (via share token)
router.get('/shared/:shareToken/comments', verifyShareToken, commentController.getPdfComments);

// Delete a comment (only creator can delete)
router.delete('/comment/:id', authenticate, commentController.deleteComment);

// Edit a comment (only creator can edit)
router.put('/comment/:id', authenticate, commentController.editComment);

module.exports = router; 