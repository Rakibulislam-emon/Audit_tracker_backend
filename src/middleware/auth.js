import jwt from "jsonwebtoken";
import User from "../models/User.js";

const auth = async (req, res, next) => {
  console.log('reached')
  let token;

  // Check for token in cookies instead of authorization header
  if (req.cookies && req.cookies?.token) {
    token = req.cookies.token;
  //  console.log(token)
  } 
  // Optional: Fallback to authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }

  try {
    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log('decoded:', decoded)
    
    // get user from db(exclude password)
    req.user = await User.findById(decoded.id).select("-password");
    
    if (!req.user) {
      return res.status(401).json({ message: "User not found - token invalid" });
    }
    
    next();
  } catch (error) {
    // console.log("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export default auth;