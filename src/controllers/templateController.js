// src/controllers/templateController.js

import Template from "../models/Template.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// GET /api/templates - With filtering, sorting, population
export const getAllTemplates = asyncHandler(async (req, res, next) => {
  // Step 1: Get filter values
  const { search, status, checkType } = req.query;

  // Step 2: Create dynamic Mongoose query object
  const query = {};

  // Step 3: Add status and checkType filters
  if (status === "active" || status === "inactive") {
    query.status = status;
  }
  if (checkType) {
    query.checkType = checkType;
  }

  // Step 4: Add search filter
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [{ title: searchRegex }, { description: searchRegex }];
  }

  // Step 5: Find data, populate relationships, and sort
  const templates = await Template.find(query)
    .populate("checkType", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

  // Step 6: Count total matching documents
  const count = await Template.countDocuments(query);

  res.status(200).json({
    data: templates,
    count: count,
    message: "Templates fetched successfully",
    success: true,
  });
});

// GET /api/templates/:id - Update population and response format
export const getTemplateById = asyncHandler(async (req, res, next) => {
  const template = await Template.findById(req.params.id)
    .populate("checkType", "name")
    .populate({
      path: "questions",
      populate: [
        { path: "rule", select: "name ruleCode" },
        { path: "checkType", select: "name" },
      ],
    })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!template) {
    throw new AppError("Template not found", 404);
  }

  res.status(200).json({
    data: template,
    message: "Template fetched successfully",
    success: true,
  });
});

// POST /api/templates - Update population and response format
export const createTemplate = asyncHandler(async (req, res, next) => {
  const { title, description, version, checkType, questions } = req.body;

  // Validation
  if (!title || !checkType) {
    throw new AppError("Title and Check Type are required", 400);
  }

  const newTemplate = new Template({
    title,
    description,
    version,
    checkType,
    questions: questions || [],
    ...createdBy(req),
  });
  let savedTemplate = await newTemplate.save();

  // Populate after saving
  savedTemplate = await Template.findById(savedTemplate._id)
    .populate("checkType", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    data: savedTemplate,
    message: "Template created successfully",
    success: true,
  });
});

// PUT /api/templates/:id - Update population and response format
export const updateTemplate = asyncHandler(async (req, res, next) => {
  const { title, description, version, checkType, questions, status } =
    req.body;
  const templateId = req.params.id;

  // Validation
  if (!title || !checkType) {
    throw new AppError("Title and Check Type are required", 400);
  }

  const updateData = {
    title,
    description,
    version,
    checkType,
    questions: questions || [],
    status,
    ...updatedBy(req),
  };

  let updatedTemplate = await Template.findByIdAndUpdate(
    templateId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!updatedTemplate) {
    throw new AppError("Template not found", 404);
  }

  // Populate after update
  updatedTemplate = await Template.findById(updatedTemplate._id)
    .populate("checkType", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedTemplate,
    message: "Template updated successfully",
    success: true,
  });
});

// DELETE /api/templates/:id - Update response format
export const deleteTemplate = asyncHandler(async (req, res, next) => {
  const deletedTemplate = await Template.findByIdAndDelete(req.params.id);

  if (!deletedTemplate) {
    throw new AppError("Template not found", 404);
  }

  res.status(200).json({
    message: "Template deleted successfully",
    success: true,
    data: deletedTemplate,
  });
});
