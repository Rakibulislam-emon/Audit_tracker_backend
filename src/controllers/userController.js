// @desc    Register a new user
// @route   POST /api/users/register
// @access  only admins

import jwt from "jsonwebtoken";
import User from "../models/User.js";
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  //  manual password added into the other fields

  console.log(name, email, password, role);
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
    console.log(user);
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
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // loginUser function এ cookie settings change করুন
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // Development এর জন্য false করুন
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
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

// get all users

const getAllUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
   
    let filter = {};

    // Search in name or email
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Role filter
    if (role) {
      filter.role = role;
    }

    // Status filter
    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    }

    // Get users with projection (exclude password)
    const users = await User.find(filter).select("-password");

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.log("Get all users error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching users",
    });
  }
};
// logout user
const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.log(" Logout error:", error.message);
    res.status(500).json({ message: "Server error during Logout" });
  }
};
// UPDATE USER

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    console.log("user:", user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
     // ✅ FIX: Convert string to boolean
    if (req.body.isActive !== undefined) {
      user.isActive = req.body.isActive === 'active' || req.body.isActive === true;
    }
    await user.save();
    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.log(" Update user error:", error.message);
    res.status(500).json({ message: "Server error during Update user" });
  }
};

// delete user
const deleteUser = async (req, res) => {
  console.log(req.params)
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log(" Delete user error:", error.message);
    res.status(500).json({ message: "Server error during Delete user" });
  }
};

export {
  deleteUser,
  getAllUsers,
  loginUser,
  logoutUser,
  registerUser,
  updateUser,
};
