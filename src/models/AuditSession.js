// src/models/AuditSession.js
import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const auditSessionSchema = new mongoose.Schema(
  {
    title: {
      // Optional title for easy identification
      type: String,
      trim: true,
      maxlength: [150, "Title cannot be more than 150 characters."],
    },
    startDate: {
      // Actual start date/time of the session
      type: Date,
      required: false, // May be set when session starts
    },
    endDate: {
      // Actual end date/time
      type: Date,
      required: false, // May be set when session ends
      validate: {
        validator: function (endDate) {
          // Only validate if both dates are present
          return !this.startDate || !endDate || endDate > this.startDate;
        },
        message: "End date must be after start date.",
      },
    },
    workflowStatus: {
      // Operational status of the session
      type: String,
      enum: {
        values: ["planned", "in-progress", "completed", "cancelled"],
        message: "{VALUE} is not a valid session workflow status.",
      },
      default: "planned",
      required: true,
    },
    template: {
      // Template being used
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      required: [true, "Template is required."],
    },
    site: {
      // Site being audited
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: [true, "Site is required."],
    },
    checkType: {
      // Optional: Specific focus area
      type: mongoose.Schema.Types.ObjectId,
      ref: "CheckType",
      required: false, // Made optional for flexibility
    },
    schedule: {
      // Link to the planned schedule
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: [true, "Schedule is required."],
    },
    auditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    leadAuditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // ===== AUDIT CLOSURE FIELDS =====
    isLocked: {
      type: Boolean,
      default: false,
      index: true, // For quick filtering of locked audits
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    closedAt: {
      type: Date,
      required: false,
    },
    closureNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Closure notes cannot exceed 500 characters."],
    },

    ...commonFields, // status (active/inactive), createdBy, updatedBy
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index: Prevent duplicate sessions for the same schedule at the same site
auditSessionSchema.index({ schedule: 1, site: 1 }, { unique: true });

// Virtual Populate: Get all team members for this session
auditSessionSchema.virtual("teamMembers", {
  ref: "Team", // The model to use
  localField: "_id", // Find people where `localField`
  foreignField: "auditSession", // is equal to `foreignField`
});

// Ensure virtuals are included in JSON output
auditSessionSchema.set("toJSON", { virtuals: true });
auditSessionSchema.set("toObject", { virtuals: true });

export default mongoose.models.AuditSession ||
  mongoose.model("AuditSession", auditSessionSchema);
