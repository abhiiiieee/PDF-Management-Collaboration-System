const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shareToken: {
    type: String,
    unique: true
  },
  sharedWith: [{
    email: String,
    accessType: {
      type: String,
      enum: ['view', 'comment', 'edit'],
      default: 'view'
    }
  }]
}, { timestamps: true });

// Generate a unique share token
pdfSchema.methods.generateShareToken = function() {
  this.shareToken = require('crypto').randomBytes(20).toString('hex');
  return this.shareToken;
};

const Pdf = mongoose.model('Pdf', pdfSchema);

module.exports = Pdf; 