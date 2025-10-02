// src/models/Rule.js

import mongoose from 'mongoose';
import commonFields from './commonFields.js';

const ruleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: String,
  ...commonFields
}, {
  timestamps: true
});

export default mongoose.models.Rule || mongoose.model('Rule', ruleSchema);