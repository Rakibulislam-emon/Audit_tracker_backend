import { validationResult } from "express-validator";
import AppError from "../utils/AppError.js";

/**
 * Validation Middleware
 *
 * Checks for validation errors from express-validator.
 * If errors exist, it throws an AppError with a 400 status code.
 *
 * Usage:
 * router.post('/route', [check('field').notEmpty()], validate, controller);
 */
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors into a single string or keep array structure
    const errorMessages = errors
      .array()
      .map((err) => err.msg)
      .join(". ");
    return next(new AppError(`Validation Error: ${errorMessages}`, 400));
  }
  next();
};
