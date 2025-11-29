/**
 * Custom Application Error Class
 *
 * Used for operational errors (expected errors that we handle gracefully)
 * Examples: Validation errors, authentication failures, not found errors
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Distinguishes operational errors from programming errors

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
