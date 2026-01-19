import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import config from "./config/config.js";
import connectDB from "./config/db.js";
// import path from 'path';

// Error Handling Imports
import globalErrorHandler from "./middleware/errorMiddleware.js";
import AppError from "./utils/AppError.js";

// Import routes
import routes from "./routes/index.js";

// Handle Uncaught Exceptions
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", err);
  process.exit(1);
});

dotenv.config();

const port = config.port;
const app = express();

import logger from "./utils/logger.js";
import morgan from "morgan";

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(cookieParser());

// Request Logging
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:3000",
        "https://audit-management-chi.vercel.app",
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Rate Limiting
import { globalLimiter } from "./middleware/rateLimiter.js";
app.use("/api", globalLimiter); // Apply to all API routes

// Middleware to lazily connect to DB
const ensureDBConnection = async (req, res, next) => {
  await connectDB();
  next();
};

// Routes (with lazy DB connection for API routes)
app.use("/api", ensureDBConnection, routes);

// Health check (fast, no DB, instant response)
app.get("/health", (req, res) => {
  res.status(200).send("ok");
});

// Graceful Shutdown
const gracefulShutdown = () => {
  logger.info("Received kill signal, shutting down gracefully");
  server.close(() => {
    logger.info("Closed out remaining connections");
    mongoose.connection.close(false, () => {
      logger.info("MongoDB connection closed");
      process.exit(0);
    });
  });

  // Force close server after 10 secs
  setTimeout(() => {
    logger.error(
      "Could not close connections in time, forcefully shutting down",
    );
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle Unhandled Routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler Middleware
app.use(globalErrorHandler);

// Start Server
const server = app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

// Handle Unhandled Rejections
process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! 💥 Shutting down...", err);
  server.close(() => {
    process.exit(1);
  });
});
