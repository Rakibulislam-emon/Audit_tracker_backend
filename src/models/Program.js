// src/models/Program.js

import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const programSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    startDate: Date,
    endDate: Date,
    // relation
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    programStatus: {
      type: String,
      enum: ["planning", "in-progress", "completed", "on-hold", "cancelled"],
      default: "planning",
    },
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Program ||
  mongoose.model("Program", programSchema);
