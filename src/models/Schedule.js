// src/models/Schedule.js

import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const scheduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Schedule title is required."],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters."],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required."],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required."],
      validate: {
        validator: function (endDate) {
          return !this.startDate || endDate > this.startDate;
        },
        message: "End date must be after start date.",
      },
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required."],
    },
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
      required: false,
    },
    purpose: {
      type: String,
      enum: {
        values: ["company", "site"],
        message: "{VALUE} is not a valid purpose.",
      },
      required: [true, "Schedule purpose is required."],
      default: "site", // Default for backward compatibility
    },
    scheduleStatus: {
      type: String,
      enum: {
        values: [
          "scheduled",
          "in-progress",
          "completed",
          "postponed",
          "cancelled",
        ],
        message: "{VALUE} is not a valid schedule status.",
      },
      default: "scheduled",
      required: true,
    },
    site: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: function () {
        return this.purpose === "site";
      },
    },

    assignedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

scheduleSchema.index({ company: 1, site: 1, startDate: 1 }, { unique: true });

export default mongoose.models.Schedule ||
  mongoose.model("Schedule", scheduleSchema);
