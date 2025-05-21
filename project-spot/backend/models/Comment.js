const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  pdf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pdf',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  guestName: {
    type: String
  },
  guestEmail: {
    type: String
  },
  text: {
    type: String,
    required: true
  },
  pageNumber: {
    type: Number,
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  position: {
    x: Number,
    y: Number
  }
}, { timestamps: true });

// Ensure either a user or guest info is provided
commentSchema.pre('validate', function(next) {
  if (!this.user && (!this.guestName || !this.guestEmail)) {
    return next(new Error('Either user ID or guest information must be provided'));
  }
  next();
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment; 