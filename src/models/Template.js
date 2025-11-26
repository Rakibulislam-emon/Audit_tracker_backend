// src/models/Template.js

import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const templateSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Template Title is required."],
      trim: true,
    },
    description: String,
    version: {
      type: String,
      default: "1.0",
    },
    // company: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Company",
    //   required: [false, "Company is required."],
    // },

    checkType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CheckType",
      required: [true, "Check Type is required."],
    },

    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],

    ...commonFields, // status, createdBy, updatedBy
  },
  {
    timestamps: true,
  }
);

// Index for faster query
templateSchema.index({ company: 1, checkType: 1 });

export default mongoose.models.Template ||
  mongoose.model("Template", templateSchema);
