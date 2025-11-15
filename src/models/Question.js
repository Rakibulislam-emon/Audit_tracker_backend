import mongoose from "mongoose";
import commonFields from "./commonFields.js";
const questionSchema = new mongoose.Schema(
  {
    section: String,
    questionText: {
      type: String,
      required: true,
      trim: true,
    },
    responseType: {
      type: String,
      required: true,
      enum: ["yes/no", "text", "number"],
    },
    severityDefault: String,
    weight: {
      type: Number,
      default: 1,
      min: 0.1,
      max: 10,
    },
    rule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rule",
      required: false,
    },

    checkType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CheckType",
      required: false,
    },
    applicableSites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Site",
        default: [], // Empty array = applies to ALL sites
      },
    ],
    // template:{
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Template",
    //   required: false,
    // },
    ...commonFields,
  },
  {
    timestamps: true,
  }
);
// Index for better searching
questionSchema.index({ checkType: 1 });
questionSchema.index({ rule: 1 });
questionSchema.index({ applicableSites: 1 });
// questionSchema.index({ template: 1 });
export default mongoose.models.Question ||
  mongoose.model("Question", questionSchema);
