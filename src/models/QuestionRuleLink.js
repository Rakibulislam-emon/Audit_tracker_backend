import mongoose from 'mongoose';
import commonFields from './commonFields.js';

const questionRuleLinkSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  rule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rule',
    required: true
  },
  // Additional relationship metadata
  complianceLevel: {
    type: String,
    enum: ['mandatory', 'recommended', 'optional', 'conditional'],
    default: 'mandatory'
  },
  weight: {
    type: Number,
    min: 0,
    max: 100,
    default: 10
  },
  reference: String, // Specific clause or section in the rule
  description: String, // How this question relates to the rule
  ...commonFields
}, {
  timestamps: true
});

// Compound index to ensure unique relationship
questionRuleLinkSchema.index({ question: 1, rule: 1 }, { unique: true });

// Index for efficient queries
questionRuleLinkSchema.index({ rule: 1 });
questionRuleLinkSchema.index({ complianceLevel: 1 });

export default mongoose.models.QuestionRuleLink || mongoose.model('QuestionRuleLink', questionRuleLinkSchema);