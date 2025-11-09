import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const ruleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Rule name or description is required."],
      trim: true,
    },
    ruleCode: {
      type: String,
      trim: true,

      required: [true, "Rule Code (e.g., SAF-001) is required."],
    },
    // category: {
    //   type: String,
    //   trim: true,
    //   required: [true, "Category (e.g., Safety, Finance) is required."],
    // },
    checkType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CheckType",
      required: [true, "Check Type (Category) is required."],
    },
    description: {
      type: String,
      trim: true,
    },
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

ruleSchema.index({ ruleCode: 1 }, { unique: true });

export default mongoose.models.Rule || mongoose.model("Rule", ruleSchema);
