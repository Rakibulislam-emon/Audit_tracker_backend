import mongoose from "mongoose";
import config from "./config.js";

const connectDB = async () => {
  console.log("🔗 Connecting to MongoDB...");

  try {
    await mongoose.connect(config.mongoUri);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
