import mongoose from 'mongoose';
import commonFields from './commonFields.js';

const observationSchema = new mongoose.Schema({
  auditSession: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AuditSession', 
    required: true 
  },
  question: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Question' 
  },
  questionText: String,
  response: String,
  severity: String,
  ...commonFields
}, {
  timestamps: true
});

export default mongoose.models.Observation || mongoose.model('Observation', observationSchema);