import mongoose from "mongoose";
const commonFields = {
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
};

export default commonFields;

