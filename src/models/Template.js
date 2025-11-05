// src/models/Template.js

import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const templateSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Template Title is required.'], 
    trim: true 
  },
  description: String,
  version: { 
    type: String, 
    default: '1.0' 
  },
  company: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: [true, 'Company is required.']
  },
  
 
  // ✅ ADDED: Array of Questions (as per audit_next.pdf )
  // This makes the Template a "Collection of Questions"
  questions: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Question' 
  }],

  // --- CHANGES END HERE ---

  ...commonFields // status, createdBy, updatedBy
}, {
  timestamps: true
});

// Index for faster query by company and checkType
templateSchema.index({ company: 1, checkType: 1 });

export default mongoose.models.Template || mongoose.model('Template', templateSchema);