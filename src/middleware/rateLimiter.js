import rateLimit from "express-rate-limit";

/**
 * Rate Limiter Configuration
 *
 * Prevents brute-force attacks and DoS by limiting the number of requests
 * from the same IP address within a specific time window.
 */

// Global Limiter: Applied to all routes
// Allow 100 requests per 15 minutes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: "fail",
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
});

// Auth Limiter: Applied to sensitive routes (login, register)
// Allow 5 requests per 15 minutes to prevent password guessing
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/register attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message:
      "Too many login attempts from this IP, please try again after 15 minutes",
  },
});
