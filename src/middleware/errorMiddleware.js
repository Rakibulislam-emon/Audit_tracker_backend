import AppError from "../utils/AppError.js";
import logger from "../utils/logger.js";

/**
 * Global Error Handling Middleware
 *
 * This middleware catches all errors thrown in the application.
 * It formats the error response based on the environment (development vs production).
 */
const globalErrorHandler = (err, req, res, next) => {
  // Set default values if they are missing
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // FORCE DEBUG: Always send detailed error
  if (true || process.env.NODE_ENV === "development") {
    console.log("!!! GLOBAL ERROR CAUGHT !!!");
    console.error(err);
    sendErrorDev(err, res);
  } else {
    // Production mode: Send clean, operational errors to client
    let error = { ...err };
    error.message = err.message;

    // Handle specific Mongoose/Database errors
    if (err.name === "CastError") error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateFieldsDB(err);
    if (err.name === "ValidationError") error = handleValidationErrorDB(err);
    if (err.name === "JsonWebTokenError") error = handleJWTError();
    if (err.name === "TokenExpiredError") error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

// -----------------------------------------------------------------------------
// Helper Functions for Error Formatting
// -----------------------------------------------------------------------------

// Send detailed error in development
const sendErrorDev = (err, res) => {
  logger.error("ERROR 💥", err);
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// Send user-friendly error in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
  // Programming or other unknown error: don't leak details
  else {
    // 1) Log error for developer
    logger.error("ERROR 💥", err);

    // 2) Send generic message
    res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }
};

// -----------------------------------------------------------------------------
// Database Error Handlers
// -----------------------------------------------------------------------------

// Handle Invalid ID errors (e.g. wrong format for MongoDB _id)
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

// Handle Duplicate Field errors (e.g. duplicate email)
const handleDuplicateFieldsDB = (err) => {
  // Extract the duplicate value using regex
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

// Handle Validation errors (e.g. missing required field)
const handleValidationErrorDB = (err) => {
  // Combine all error messages from validation
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

// Handle Invalid JWT Token
const handleJWTError = () => {
  return new AppError("Invalid token. Please log in again!", 401);
};

// Handle Expired JWT Token
const handleJWTExpiredError = () => {
  return new AppError("Your token has expired! Please log in again.", 401);
};

export default globalErrorHandler;
