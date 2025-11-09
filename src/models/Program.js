import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const programSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Program name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startDate: {
      type: Date,
      doc: "The date the program officially begins.",
    },
    endDate: {
      type: Date,
      doc: "The date the program ends. Can be null for ongoing programs.",
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
      // index: true,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Template",
      required: [true, "Template is required"],
      // index: true,
    },

    frequency: {
      type: String,
      enum: ["one-time", "daily", "weekly", "monthly", "quarterly", "yearly"],
      default: "monthly",
    },
    responsibleDept: {
      type: String,
      trim: true,
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

programSchema.index(
  { company: 1, programStatus: 1 },
  { name: "company_program_status_idx" }
);
programSchema.index(
  { company: 1, template: 1 },
  { name: "company_template_idx" }
);

export default mongoose.models.Program ||
  mongoose.model("Program", programSchema);