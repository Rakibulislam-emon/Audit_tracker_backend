import mongoose from "mongoose";
import commonFields from "./commonFields.js";

// common fields for all groups


const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Group || mongoose.model("Group", groupSchema);
