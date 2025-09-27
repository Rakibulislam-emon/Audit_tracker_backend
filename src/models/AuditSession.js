import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const auditSessionSchema = new mongoose.Schema(
  {
    startDate: Date,
    endDate: Date,
    workflowStatus: {  
      type: String,
      enum: ["planned", "in-progress", "completed", "cancelled"],
      default: "planned",
    },

    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      required: true,
    },
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },
    checkType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CheckType",
      required: true,
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.AuditSession ||
  mongoose.model("AuditSession", auditSessionSchema);
