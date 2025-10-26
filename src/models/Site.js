// src/models/Site.js

import mongoose from 'mongoose';
import commonFields from './commonFields.js';



const siteSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  location: {
    type: String, 
    required: true, 
    trim: true
  },
  company: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true 
  },
  ...commonFields
}, {
  timestamps: true
});

export default mongoose.models.Site || mongoose.model('Site', siteSchema);