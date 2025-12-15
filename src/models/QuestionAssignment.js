import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const questionAssignmentSchema = new mongoose.Schema(
  {
    auditSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditSession",
      required: [true, "Audit Session is required."],
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: [true, "Question is required."],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned user is required."],
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigner is required."],
    },
    ...commonFields, // Includes timestamps (createdAt, updatedAt) and status
  },
  {
    timestamps: true,
  }
);

// ✅ Unique Index: Ensure a question is assigned to only one person per session
questionAssignmentSchema.index(
  { auditSession: 1, question: 1 },
  { unique: true }
);

// Index for faster lookups by session or user
questionAssignmentSchema.index({ auditSession: 1, assignedTo: 1 });

const QuestionAssignment =
  mongoose.models.QuestionAssignment ||
  mongoose.model("QuestionAssignment", questionAssignmentSchema);

export default QuestionAssignment;
