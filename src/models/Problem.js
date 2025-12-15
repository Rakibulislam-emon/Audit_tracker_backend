// src/models/Problem.js
import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const problemSchema = new mongoose.Schema(
  {
    auditSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditSession",
      required: [true, "Audit Session is required."],
    },
    observation: {
      // ✅ Link to originating Observation (Optional)
      type: mongoose.Schema.Types.ObjectId,
      ref: "Observation",
      required: false,
    },
    question: {
      // Optional link to related Question (from Observation or direct)
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: false,
    },
    title: {
      type: String,
      required: [true, "Problem title is required."],
      trim: true,
      maxlength: [150, "Title cannot be more than 150 characters."], // Increased length slightly
    },
    description: {
      // Detailed description of the problem/finding
      type: String,
      required: [true, "Description is required."], // Made description required
      trim: true,
    },
    impact: {
      // Potential consequence if not addressed
      type: String,
      enum: {
        values: ["Low", "Medium", "High"],
        message: "{VALUE} is not a valid impact level.",
      }, // Capitalized for display
      default: "Medium",
      required: [true, "Impact assessment is required."],
    },
    likelihood: {
      // Probability of occurrence
      type: String,
      enum: {
        values: ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"],
        message: "{VALUE} is not a valid likelihood.",
      }, // Capitalized
      default: "Possible",
      required: [true, "Likelihood assessment is required."],
    },
    riskRating: {
      // Overall risk level (manually set or derived)
      type: String,
      enum: {
        values: ["Low", "Medium", "High", "Critical"],
        message: "{VALUE} is not a valid risk rating.",
      }, // Added Critical, Capitalized
      default: "Medium",
      required: [true, "Risk rating is required."],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    proofs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Proof", // Assuming Proof model exists or will exist
      },
    ],
    problemStatus: {
      // Status of resolving the problem
      type: String,
      enum: {
        values: ["Open", "In Progress", "Resolved", "Closed"],
        message: "{VALUE} is not a valid problem status.",
      }, // Simplified options
      default: "Open",
      required: true,
    },
    methodology: {
      // How the problem was identified (optional detail)
      type: String,
      trim: true,
    },
    fixActions: [
      {
        // ✅ Link to corrective actions
        type: mongoose.Schema.Types.ObjectId,
        ref: "FixAction", // Needs FixAction model
        required: false,
      },
    ],
    ...commonFields, // status (active/inactive), createdBy, updatedBy
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// No unique index on title+session by default, handled in controller if needed.
// Optional: Index for faster querying
problemSchema.index({ auditSession: 1, problemStatus: 1 });
problemSchema.index({ auditSession: 1, status: 1 });

export default mongoose.models.Problem ||
  mongoose.model("Problem", problemSchema);
