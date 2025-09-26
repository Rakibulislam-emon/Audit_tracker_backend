import commonFields from "./commonFields.js";
import mongoose from "mongoose";
const questionSchema = new mongoose.Schema({
  section: String,
  questionText: { 
    type: String, 
    required: true, 
    trim: true 
  },
  responseType: { 
    type: String, 
    required: true,
    enum: ['yes/no', 'text', 'number', 'rating', 'dropdown']
  },
  severityDefault: String,
  weight: { 
    type: Number, 
    default: 1,
    min: 0.1,
    max: 10
  },
  template: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Template', 
    required: true 
  },
  ...commonFields
}, {
  timestamps: true
});



export default mongoose.models.Question || mongoose.model('Question', questionSchema);

