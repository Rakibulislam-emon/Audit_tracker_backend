import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const problemSchema = new mongoose.Schema(
  {
    auditSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditSession",
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    impact: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    likelihood: {
      type: String,
      enum: ["rare", "unlikely", "possible", "likely", "almost certain"],
      default: "possible",
    },
    riskRating: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    problemStatus: {
      type: String,
      enum: ["open", "in progress", "resolved"],
      default: "open",
    },
    methodology: String,
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Problem ||
  mongoose.model("Problem", problemSchema);
