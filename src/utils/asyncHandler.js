/**
 * Async Handler Wrapper
 *
 * This function wraps asynchronous route handlers (controllers) to avoid repetitive try-catch blocks.
 * It automatically catches any errors and passes them to the next middleware (the global error handler).
 *
 * Usage:
 * import asyncHandler from '../utils/asyncHandler.js';
 *
 * export const myController = asyncHandler(async (req, res, next) => {
 *   // Your async code here
 *   const data = await Model.find();
 *   res.status(200).json({ success: true, data });
 * });
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    // Execute the function and catch any errors
    fn(req, res, next).catch((err) => next(err));
  };
};

export default asyncHandler;
