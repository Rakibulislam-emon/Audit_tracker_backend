// src/controllers/checkTypeController.js

import CheckType from "../models/CheckType.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// GET /api/check-types - With filtering, sorting, population
export const getAllCheckTypes = asyncHandler(async (req, res, next) => {
  // Step 1: Get filter values from req.query
  const { search, status } = req.query;

  // Step 2: Create dynamic Mongoose query object
  const query = {};

  // Step 3: Add status filter
  if (status === "active" || status === "inactive") {
    query.status = status;
  }

  // Step 4: Add search filter
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [{ name: searchRegex }, { description: searchRegex }];
  }

  // Step 5: Find data using the dynamic query, populate, and sort
  const checkTypes = await CheckType.find(query)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

  // Step 6: Count total matching documents
  const count = await CheckType.countDocuments(query);

  res.status(200).json({
    data: checkTypes,
    count: count,
    message: "Check Types fetched successfully",
    success: true,
  });
});

// GET /api/check-types/:id - Update population and response format
export const getCheckTypeById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const checkType = await CheckType.findById(id)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!checkType) {
    throw new AppError("CheckType not found", 404);
  }

  res.status(200).json({
    data: checkType,
    message: "CheckType fetched successfully",
    success: true,
  });
});

// POST /api/check-types - Update population and response format
export const createCheckType = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;

  // Validation
  if (!name || !description) {
    throw new AppError("Name and Description are required", 400);
  }

  const newCheckType = new CheckType({
    name,
    description,
    ...createdBy(req),
  });
  let savedCheckType = await newCheckType.save();

  // Populate after saving
  savedCheckType = await CheckType.findById(savedCheckType._id)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    data: savedCheckType,
    message: "CheckType created successfully",
    success: true,
  });
});

// PUT /api/check-types/:id - Update population and response format
export const updateCheckType = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;
  const checkTypeId = req.params.id;

  // Validation
  if (!name || !description) {
    throw new AppError("Name and Description are required", 400);
  }

  let updatedCheckType = await CheckType.findByIdAndUpdate(
    checkTypeId,
    {
      name,
      description,
      ...updatedBy(req),
    },
    { new: true, runValidators: true }
  );

  if (!updatedCheckType) {
    throw new AppError("CheckType not found", 404);
  }

  // Populate after update
  updatedCheckType = await CheckType.findById(updatedCheckType._id)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedCheckType,
    message: "CheckType updated successfully",
    success: true,
  });
});

// DELETE /api/check-types/:id - Update response format
export const deleteCheckType = asyncHandler(async (req, res, next) => {
  const deletedCheckType = await CheckType.findByIdAndDelete(req.params.id);

  if (!deletedCheckType) {
    throw new AppError("CheckType not found", 404);
  }

  res.status(200).json({
    message: "CheckType deleted successfully",
    success: true,
    data: deletedCheckType,
  });
});
