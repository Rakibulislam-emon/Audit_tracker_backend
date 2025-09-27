import mongoose from 'mongoose';
import commonFields from './commonFields.js';

const fixActionSchema = new mongoose.Schema({
  problem: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Problem', 
    required: true 
  },
  actionText: { 
    type: String, 
    required: true, 
    trim: true 
  },
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  deadline: { 
    type: Date, 
    required: true 
  },
  actionStatus: { 
    type: String, 
    default: 'pending',
    enum: ['pending', 'in-progress', 'completed', 'verified', 'rejected']
  },
  reviewNotes: String,
  verificationMethod: String,
  verifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  verifiedAt: Date,
  verificationResult: String,
  ...commonFields
}, {
  timestamps: true
});

export default mongoose.models.FixAction || mongoose.model('FixAction', fixActionSchema);