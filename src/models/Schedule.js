
import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const scheduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (endDate) {
          return endDate > this.startDate;
        },
        message: "End date must be after start date",
      },
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program",
    },
    ...commonFields,
  },
  {
    timestamps: true,
  }
);

scheduleSchema.index({ company: 1, startDate: 1 }, { unique: true });

export default mongoose.models.Schedule ||
  mongoose.model("Schedule", scheduleSchema);
