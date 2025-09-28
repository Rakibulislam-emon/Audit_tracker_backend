import mongoose from 'mongoose';
import commonFields from './commonFields.js';

const proofSchema = new mongoose.Schema({
  problem: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Problem', 
    required: true 
  },
  fileType: {  // কি ধরনের ফাইল? (image, video, document)
    type: String,
    enum: ['image', 'document', 'video', 'audio'],
    required: true
  },
  originalName: {  // User-এর দেওয়া original filename
    type: String,
    required: true
  },
  fileName: {  // Server-এ save হওয়া unique filename
    type: String,
    required: true
  },
  filePath: {  // Server-এ file-এর exact path
    type: String,
    required: true
  },
  mimeType: {  // File type (image/jpeg, application/pdf, etc.)
    type: String,
    required: true
  },
  size: {  // File size in bytes
    type: Number,
    required: true
  },
  caption: {  // User-এর দেওয়া description
    type: String
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  ...commonFields
}, {
  timestamps: true
});

export default mongoose.models.Proof || mongoose.model('Proof', proofSchema);