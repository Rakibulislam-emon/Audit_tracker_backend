import mongoose from "mongoose";
import commonFields from "./commonFields.js";

// Company Schema
const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    
    sector: String,
    address: String,
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Company ||
  mongoose.model("Company", companySchema);
