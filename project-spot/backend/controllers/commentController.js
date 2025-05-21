const Comment = require('../models/Comment');
const Pdf = require('../models/Pdf');

// Add a comment to a PDF
exports.addComment = async (req, res) => {
  try {
    const { pdfId, text, pageNumber, position, parentCommentId } = req.body;
    
    // Check if PDF exists
    const pdf = req.pdf || await Pdf.findById(pdfId);
    
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }

    // Create comment object
    const commentData = {
      pdf: pdf._id,
      text,
      pageNumber,
      position
    };

    // Set user or guest info
    if (req.user) {
      commentData.user = req.user._id;
    } else {
      // For guest comments
      const { guestName, guestEmail } = req.body;
      
      if (!guestName || !guestEmail) {
        return res.status(400).json({ 
          message: 'Guest name and email are required for non-authenticated users' 
        });
      }
      
      commentData.guestName = guestName;
      commentData.guestEmail = guestEmail;
    }

    // Set parent comment if replying
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({ message: 'Parent comment not found' });
      }
      commentData.parentComment = parentCommentId;
    }

    // Create and save the comment
    const comment = new Comment(commentData);
    await comment.save();

    // Populate user info if authenticated
    if (comment.user) {
      await comment.populate('user', 'name email');
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all comments for a PDF
exports.getPdfComments = async (req, res) => {
  try {
    const pdfId = req.params.pdfId || req.pdf._id;

    // Get all comments for this PDF
    const comments = await Comment.find({ pdf: pdfId })
      .populate('user', 'name email')
      .populate('parentComment')
      .sort('createdAt');

    res.json({ comments });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a comment (only the owner can delete)
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find comment
    const comment = await Comment.findById(id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check ownership (only user who created can delete)
    if (comment.user && comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
    
    // Delete comment
    await Comment.deleteOne({ _id: id });
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Edit a comment (only the owner can edit)
exports.editComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    // Find comment
    const comment = await Comment.findById(id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check ownership (only user who created can edit)
    if (comment.user && comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }
    
    // Update comment
    comment.text = text;
    await comment.save();
    
    res.json({ 
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 