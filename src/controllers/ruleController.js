// src/controllers/ruleController.js

import Rule from "../models/Rule.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// GET /api/rules - With filtering, sorting, population
export const getAllRules = asyncHandler(async (req, res, next) => {
  // Step 1: Get filter values
  const { search, status, checkType, ruleCode } = req.query;

  // Step 2: Create dynamic Mongoose query object
  const query = {};

  // Step 3: Add status & checkType filters
  if (status === "active" || status === "inactive") {
    query.status = status;
  }
  if (checkType) {
    query.checkType = checkType;
  }
  if (ruleCode) {
    query.ruleCode = { $regex: ruleCode, $options: "i" };
  }

  // Step 4: Add search filter (name, description, ruleCode)
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { ruleCode: searchRegex },
    ];
  }

  // Step 5: Find data, populate new fields
  const rules = await Rule.find(query)
    .populate("checkType", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

  // Step 6: Count total matching documents
  const count = await Rule.countDocuments(query);

  res.status(200).json({
    data: rules,
    count: count,
    message: "Rules fetched successfully",
    success: true,
  });
});

// GET /api/rules/:id - Update population and response format
export const getRuleById = asyncHandler(async (req, res, next) => {
  const rule = await Rule.findById(req.params.id)
    .populate("checkType", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!rule) {
    throw new AppError("Rule not found", 404);
  }

  res.status(200).json({
    data: rule,
    message: "Rule fetched successfully",
    success: true,
  });
});

// POST /api/rules - Update population and response format
export const createRule = asyncHandler(async (req, res, next) => {
  const { name, description, ruleCode, checkType } = req.body;

  // Validation
  if (!name || !ruleCode || !checkType) {
    throw new AppError("Name, Rule Code, and Check Type are required", 400);
  }

  const newRule = new Rule({
    name,
    description,
    ruleCode,
    checkType,
    ...createdBy(req),
  });
  let savedRule = await newRule.save();

  // Populate after saving
  savedRule = await Rule.findById(savedRule._id)
    .populate("checkType", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    data: savedRule,
    message: "Rule created successfully",
    success: true,
  });
});

// PUT /api/rules/:id - Update population and response format
export const updateRule = asyncHandler(async (req, res, next) => {
  const { name, description, ruleCode, checkType, status } = req.body;
  const ruleId = req.params.id;

  // Validation
  if (!name || !ruleCode || !checkType) {
    throw new AppError("Name, Rule Code, and Check Type are required", 400);
  }

  const updateData = {
    name,
    description,
    ruleCode,
    checkType,
    status,
    ...updatedBy(req),
  };

  let updatedRule = await Rule.findByIdAndUpdate(ruleId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedRule) {
    throw new AppError("Rule not found", 404);
  }

  // Populate after update
  updatedRule = await Rule.findById(updatedRule._id)
    .populate("checkType", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedRule,
    message: "Rule updated successfully",
    success: true,
  });
});

// DELETE /api/rules/:id - Update response format
export const deleteRule = asyncHandler(async (req, res, next) => {
  const deletedRule = await Rule.findByIdAndDelete(req.params.id);
  if (!deletedRule) {
    throw new AppError("Rule not found", 404);
  }

  res.status(200).json({
    message: "Rule deleted successfully",
    success: true,
    data: deletedRule,
  });
});
