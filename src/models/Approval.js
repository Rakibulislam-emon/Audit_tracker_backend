import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const approvalSchema = new mongoose.Schema(
  {
    // Which entity needs approval
    entityType: {
      type: String,
      required: true,
      enum: [
        "Report",
        "Problem",
        "FixAction",
        "AuditSession",
        "Template",
        "Schedule",
      ],
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "entityType",
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    approvalStatus: {
      type: String,
      enum: [
        "pending",
        "in-review",
        "approved",
        "rejected",
        "cancelled",
        "escalated",
      ],
      default: "pending",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Changed from true to allow unassigned/pool approvals
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Decision details
    decision: {
      decision: {
        type: String,
        enum: ["approved", "rejected", "escalated"],
        default: null,
      },
      decisionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      decisionAt: Date,
      comments: String,
      escalationReason: String,
      escalatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },

    // Timeline
    timeline: {
      requestedAt: {
        type: Date,
        default: Date.now,
      },
      deadline: Date,
      respondedAt: Date,
      slaStatus: {
        type: String,
        enum: ["on-time", "warning", "overdue"],
        default: "on-time",
      },
    },

    requirements: [
      {
        description: String,
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
        completedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],

    reviewHistory: [
      {
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        reviewedAt: {
          type: Date,
          default: Date.now,
        },
        action: {
          type: String,
          enum: [
            "submitted",
            "reviewed",
            "commented",
            "escalated",
            "approved",
            "rejected",
          ],
        },
        comments: String,
        attachments: [String],
      },
    ],

    notifications: {
      reminderSent: {
        type: Boolean,
        default: false,
      },
      reminderSentAt: Date,
      escalationSent: {
        type: Boolean,
        default: false,
      },
      escalationSentAt: Date,
    },

    ...commonFields,
  },
  {
    timestamps: true,
  }
);

// Indexes
approvalSchema.index({ entityType: 1, entityId: 1 });
approvalSchema.index({ approver: 1, approvalStatus: 1 });
approvalSchema.index({ requestedBy: 1 });
approvalSchema.index({ "timeline.deadline": 1 });

// Virtual for checking if approval is overdue
approvalSchema.virtual("isOverdue").get(function () {
  if (!this.timeline.deadline || this.approvalStatus !== "pending")
    return false; // ✅ approvalStatus
  return new Date() > this.timeline.deadline;
});

// Static method to find pending approvals for a user
approvalSchema.statics.findPendingForUser = function (userId) {
  return this.find({
    approver: userId,
    approvalStatus: { $in: ["pending", "in-review"] },
  })
    .populate("entityId")
    .populate("requestedBy", "name email");
};

export default mongoose.models.Approval ||
  mongoose.model("Approval", approvalSchema);
