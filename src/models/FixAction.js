// src/models/FixAction.js
import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const fixActionSchema = new mongoose.Schema(
  {
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: [true, "Related Problem is required."],
    },
    observation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Observation",
      required: false,
    },
    actionText: {
      type: String,
      required: [true, "Action description is required."],
      trim: true,
    },
    owner: {
      // User responsible for execution
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner (User) is required."],
    },
    deadline: {
      type: Date,
      required: [true, "Deadline is required."],
    },
    actionStatus: {
      // Workflow status of the action itself
      type: String,
      required: true,
      enum: {
        values: ["Pending", "In Progress", "Completed", "Verified", "Rejected"], // Capitalized, consistent values
        message: "{VALUE} is not a valid action status.",
      },
      default: "Pending",
    },

    // ===== CAPA FIELDS =====
    rootCause: {
      // Root Cause Analysis: Why did the problem occur?
      type: String,
      trim: true,
      required: false, // Optional initially, may require upon submission
    },
    correctiveAction: {
      // Corrective Action: Fix for this specific instance
      type: String,
      trim: true,
      required: false,
    },
    preventiveAction: {
      // Preventive Action: Prevent recurrence in the future
      type: String,
      trim: true,
      required: false,
    },

    reviewNotes: {
      // Notes from reviewer/verifier
      type: String,
      trim: true,
    },
    verificationMethod: {
      // How completion was verified
      type: String,
      trim: true,
    },
    verifiedBy: {
      // User who verified
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Only applicable after verification
    },
    verifiedAt: {
      // Timestamp of verification
      type: Date,
      required: false,
    },
    // ✅ verificationResult কে Enum করা হলো
    verificationResult: {
      type: String,
      enum: {
        values: [
          "Effective",
          "Ineffective",
          "Partially Effective",
          "Not Applicable",
          "Pending Verification",
        ], // Added Pending
        message: "{VALUE} is not a valid verification result.",
      },
      required: false, // Not required until verified
    },
    // ✅ commonFields (status সহ) ব্যবহার করা হচ্ছে
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

// Optional Index for faster lookup by problem or owner
fixActionSchema.index({ problem: 1, actionStatus: 1 });
fixActionSchema.index({ owner: 1, actionStatus: 1 });

export default mongoose.models.FixAction ||
  mongoose.model("FixAction", fixActionSchema);
