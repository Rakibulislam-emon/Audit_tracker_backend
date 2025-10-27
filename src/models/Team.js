import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const teamSchema = new mongoose.Schema(
  {
    auditSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditSession",
      required: [true, "Audit Session is required."],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required."],
    },
    roleInTeam: {
      type: String,
      required: [true, "Role within the team is required."],
      trim: true,
      enum: {
        values: ["lead", "member", "observer", "specialist"],
        message: "{VALUE} is not a valid role in this team.",
      },
    },
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

teamSchema.index({ auditSession: 1, user: 1 }, { unique: true });

export default mongoose.models.Team || mongoose.model("Team", teamSchema);
