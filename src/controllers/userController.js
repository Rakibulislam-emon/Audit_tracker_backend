// @desc    Register a new user
// @route   POST /api/users/register
// @access  only admins

import jwt from "jsonwebtoken";
import User from "../models/User.js";
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }
    // create new user
    const user = new User({
      name,
      email,
      password,
      role: role || "auditor",
    });
    await user.save();
    // send success response without password

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      message: "User registered successfully",
    });
  } catch (error) {
    console.log(" Registration error:", error.message);
    res.status(500).json({ message: "Server error during Registration" });
  }
};

// @desc Login user and get token
// @route POST /api/users/login
// @access Public

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    // check if user exists
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }
    // check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    // generate token(expiry 7 days)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    // update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    // Send response (without password)
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    });
  } catch (error) {
    console.log(" Login error:", error.message);
    res.status(500).json({ message: "Server error during Login" });
  }
};

export { registerUser,loginUser };
