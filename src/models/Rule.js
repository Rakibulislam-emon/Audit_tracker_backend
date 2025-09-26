import mongoose from "mongoose";

import commonFields from "./commonFields.js";
const checkTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
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

export default mongoose.models.CheckType ||
  mongoose.model("CheckType", checkTypeSchema);
