import AppError from "../utils/AppError.js";

const readOnly = (req, res, next) => {
  // Check if the user is in read-only mode (set during JWT decoding or custom login)
  if (req.user && req.user.isReadOnly) {
    // Only allow GET requests
    if (req.method !== "GET") {
      return next(
        new AppError(
          "Feature disabled in Demo/Read-Only mode. Please register for full access.",
          403
        )
      );
    }
  }
  next();
};

export default readOnly;
