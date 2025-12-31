import jwt from "jsonwebtoken";
import User from "../models/User.js";

const auth = async (req, res, next) => {
  console.log("reached");
  let token;

  // Check for token in cookies instead of authorization header
  if (req.cookies && req.cookies?.token) {
    token = req.cookies.token;
    //  console.log(token)
  }
  // Optional: Fallback to authorization header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Not authorized, no token provided" });
  }

  try {
    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('decoded:', decoded)

    // get user from db(exclude password)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found - token invalid" });
    }

    // Attach isReadOnly flag from token to request user object
    req.user = user.toObject();
    req.user.isReadOnly = !!decoded.isReadOnly;

    console.log(
      `[AUTH] Path: ${req.originalUrl}, Method: ${req.method}, isReadOnly: ${req.user.isReadOnly}`
    );

    // STRICT READ-ONLY CHECK: Block all mutations if in read-only mode
    // Exception: Allow logout (POST /logout)
    if (
      req.user.isReadOnly &&
      req.method !== "GET" &&
      !req.originalUrl.endsWith("/logout")
    ) {
      return res.status(403).json({
        message:
          "Action restricted in Demo Mode. Please sign up for full access to Create/Update/Delete features.",
      });
    }

    next();
  } catch (error) {
    // console.log("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export default auth;
