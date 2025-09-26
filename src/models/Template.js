import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const templateSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
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
    required: true 
  },
  ...commonFields
}, {
  timestamps: true
});

export default mongoose.models.Template || mongoose.model('Template', templateSchema);