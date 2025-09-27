import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const teamSchema = new mongoose.Schema(
  {
    auditSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditSession",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    roleInTeam: {
      type: String,
      required: true,
    },
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Team || mongoose.model("Team", teamSchema);
