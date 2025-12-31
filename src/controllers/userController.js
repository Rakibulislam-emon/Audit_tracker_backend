// @desc    Register a new user
// @route   POST /api/users/register
// @access  only admins

import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { validateAuthority } from "../utils/authority.js";

const registerUser = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    password,
    role,
    assignTo,
    assignedGroup,
    assignedCompany,
    assignedSite,
  } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("User already exists with this email", 400);
  }

  // INTELLIGENT AUTO-FILL: Fill anchors from requester if missing
  const finalAssignedGroup =
    assignedGroup ||
    (req.user.assignedGroup ? req.user.assignedGroup.toString() : null);
  const finalAssignedCompany =
    assignedCompany ||
    (req.user.assignedCompany ? req.user.assignedCompany.toString() : null);
  const finalAssignedSite =
    assignedSite ||
    (req.user.assignedSite ? req.user.assignedSite.toString() : null);

  // Authority Validation
  validateAuthority(req.user, {
    role: role || "auditor",
    scopeLevel: assignTo, // assignTo determines the scope level
    assignedGroup: finalAssignedGroup,
    assignedCompany: finalAssignedCompany,
    assignedSite: finalAssignedSite,
  });

  // Auto-set scopeLevel based on assignTo
  let scopeLevel = "system"; // default
  if (assignTo === "group") scopeLevel = "group";
  else if (assignTo === "company") scopeLevel = "company";
  else if (assignTo === "site") scopeLevel = "site";

  // Create new user
  const user = new User({
    name,
    email,
    password,
    role: role || "auditor",
    scopeLevel,
    assignedGroup: finalAssignedGroup,
    assignedCompany: finalAssignedCompany,
    assignedSite: finalAssignedSite,
  });

  await user.save();

  // Send success response without password
  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    scopeLevel: user.scopeLevel,
    message: "User registered successfully",
  });
});

// @desc Login user and get token
// @route POST /api/users/login
// @access Public
const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password exist
  if (!email || !password) {
    throw new AppError("Please provide email and password", 400);
  }

  // Check if user exists & password is correct
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    throw new AppError("Invalid email or password", 401);
  }

  // Generate token
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Update last login
  user.lastLogin = Date.now();
  await user.save({ validateBeforeSave: false });

  // Send response
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    scopeLevel: user.scopeLevel,
    assignedGroup: user.assignedGroup,
    assignedCompany: user.assignedCompany,
    assignedSite: user.assignedSite,
    isReadOnly: false,
    token,
  });
});

// @desc Login as Super Admin (Demo Mode)
// @route POST /api/users/demo-login
// @access Public
const demoLogin = asyncHandler(async (req, res, next) => {
  const email = "superadmin@example.com";

  // Check if user exists
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError(
      "Demo account not found. Please seed the database.",
      404
    );
  }

  // Generate token with isReadOnly: true
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email, isReadOnly: true },
    process.env.JWT_SECRET,
    { expiresIn: "1d" } // Demo sessions are shorter
  );

  // Set cookie for token (matching regular login)
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });

  // Send response
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    scopeLevel: user.scopeLevel,
    assignedGroup: user.assignedGroup,
    assignedCompany: user.assignedCompany,
    assignedSite: user.assignedSite,
    isReadOnly: true,
    token,
  });
});

// @desc Get all users
// @route GET /api/users
// @access Private
const getAllUsers = asyncHandler(async (req, res, next) => {
  const { search, role, status, group, company, site } = req.query;

  let filter = {};

  // Search in name or email
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Role filter (support single or multiple)
  if (role) {
    // If role involves comma-separated string or array
    const roles = Array.isArray(role) ? role : role.split(",");
    if (roles.length > 1) {
      filter.role = { $in: roles };
    } else {
      filter.role = roles[0];
    }
  }

  // Scope filters
  if (group) filter.assignedGroup = group;
  if (company) filter.assignedCompany = company;
  if (site) filter.assignedSite = site;

  // Status filter
  if (status === "active") {
    filter.isActive = true;
  } else if (status === "inactive") {
    filter.isActive = false;
  }

  // Get users with projection (exclude password) and populate scope fields
  const users = await User.find(filter)
    .select("-password")
    .populate("assignedGroup", "name")
    .populate("assignedCompany", "name")
    .populate("assignedSite", "name");

  res.json({
    success: true,
    count: users.length,
    data: users,
  });
});

// @desc Get user by ID
// @route GET /api/users/:id
// @access Private
const getUserById = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select("-password")
    .populate("assignedGroup", "name")
    .populate("assignedCompany", "name")
    .populate("assignedSite", "name");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.json({
    success: true,
    data: user,
  });
});

// @desc Logout user
// @route POST /api/users/logout
// @access Private
const logoutUser = asyncHandler(async (req, res, next) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logout successful" });
});

// @desc Update user
// @route PUT /api/users/:id
// @access Private
const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.role = req.body.role || user.role;

  // Auto-set scopeLevel based on assignTo if provided
  if (req.body.assignTo) {
    if (req.body.assignTo === "group") user.scopeLevel = "group";
    else if (req.body.assignTo === "company") user.scopeLevel = "company";
    else if (req.body.assignTo === "site") user.scopeLevel = "site";
  }

  // Update scope assignments
  if (req.body.assignedGroup !== undefined)
    user.assignedGroup = req.body.assignedGroup;
  if (req.body.assignedCompany !== undefined)
    user.assignedCompany = req.body.assignedCompany;
  if (req.body.assignedSite !== undefined)
    user.assignedSite = req.body.assignedSite;

  // Convert string to boolean if present
  if (req.body.isActive !== undefined) {
    user.isActive =
      req.body.isActive === "active" || req.body.isActive === true;
  }

  await user.save();
  res.status(200).json({ message: "User updated successfully" });
});

// @desc Delete user
// @route DELETE /api/users/:id
// @access Private
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  res.status(200).json({ message: "User deleted successfully" });
});

export {
  deleteUser,
  getAllUsers,
  getUserById,
  loginUser,
  demoLogin,
  logoutUser,
  registerUser,
  updateUser,
};
