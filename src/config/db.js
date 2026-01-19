import mongoose from "mongoose";
import config from "./config.js";

let isConnecting = false;

const connectDB = async () => {
  // Already connected
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // Connection in progress
  if (isConnecting) {
    // Wait for existing connection attempt
    await new Promise((resolve) => {
      const checkConnection = setInterval(() => {
        if (mongoose.connection.readyState === 1) {
          clearInterval(checkConnection);
          resolve();
        }
      }, 100);
    });
    return;
  }

  isConnecting = true;
  console.log("🔗 Connecting to MongoDB...");

  try {
    await mongoose.connect(config.mongoUri);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  } finally {
    isConnecting = false;
  }
};

export default connectDB;
