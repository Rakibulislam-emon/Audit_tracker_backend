import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const reportSchema = new mongoose.Schema(
  {
    auditSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditSession",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
    },
    executiveSummary: {
      type: String,
      required: true,
    },
    findings: [
      {
        problem: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Problem",
          required: true,
        },
        description: String,
        riskLevel: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
          default: "medium",
        },
        recommendation: String,
      },
    ],
    metrics: {
      totalProblems: { type: Number, default: 0 },
      criticalProblems: { type: Number, default: 0 },
      highRiskProblems: { type: Number, default: 0 },
      mediumRiskProblems: { type: Number, default: 0 },
      lowRiskProblems: { type: Number, default: 0 },
      complianceScore: { type: Number, default: 0 }, // Percentage
      overallRiskRating: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "medium",
      },
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    reportType: {
      type: String,
      enum: ["draft", "preliminary", "final", "executive"],
      default: "draft",
    },
    reportStatus: {
      type: String,
      enum: [
        "generating",
        "completed",
        "pending_approval",
        "published",
        "archived",
      ], // ✅ ADDED pending_approval
      default: "generating",
    },
    filePath: String, // If report is saved as PDF
    fileName: String,
    fileSize: Number,
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

// Index for better performance
reportSchema.index({ auditSession: 1 });
reportSchema.index({ generatedBy: 1 });
reportSchema.index({ status: 1 });

export default mongoose.models.Report || mongoose.model("Report", reportSchema);
