// src/models/Observation.js
import mongoose from "mongoose";
import commonFields from "./commonFields.js"; 

const observationSchema = new mongoose.Schema(
  {
    auditSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditSession",
      required: [true, "Audit Session is required."],
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: false, // Optional for general observations
    },
    questionText: {
      // Store the question text at the time of observation
      type: String,
      required: [true, "Question text or observation detail is required."],
      trim: true,
    },
    response: {
      // Auditor's response (string captures various types)
      type: String,
      trim: true,
      required: false, // Response might not always be applicable
    },
    severity: {
      // Severity level if it's a finding/issue
      type: String,
      enum: {
        values: ["Informational", "Low", "Medium", "High", "Critical"],
        message: "{VALUE} is not a valid severity level.",
      },
      required: false, // Not every observation has severity
    },
    resolutionStatus: {
      // Specific status for tracking resolution
      type: String,
      enum: {
        values: [
          "Open",
          "In Progress",
          "Resolved",
          "Closed - Verified",
          "Closed - Risk Accepted",
        ],
        message: "{VALUE} is not a valid resolution status.",
      },
      default: "Open",
      required: true,
    },
    problem: {
      // Link to a Problem if created from this observation
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: false,
    },
    // Include common fields (status, createdBy, updatedBy)
    ...commonFields,
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Optional Index for faster querying
observationSchema.index({ auditSession: 1, resolutionStatus: 1 });
observationSchema.index({ auditSession: 1, status: 1 });
observationSchema.index({ question: 1 });

export default mongoose.models.Observation ||
  mongoose.model("Observation", observationSchema);
