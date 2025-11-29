/**
 * @fileoverview Controller for handling all CRUD operations for the Program resource.
 * @module controllers/programController
 */

import Program from "../models/Program.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

/**
 * Retrieves a list of programs with advanced filtering, searching, and sorting.
 * Supports filtering by company, template, status, date ranges, and more.
 * @route GET /api/programs
 * @access Public/Protected (depending on middleware)
 */
export const getAllPrograms = asyncHandler(async (req, res, next) => {
  const {
    search,
    status,
    programStatus,
    startDate,
    endDate,
    template,
    frequency,
    responsibleDept,
  } = req.query;

  // Dynamically construct the filter object based on provided query parameters.
  const query = {};

  // Apply filters for relational fields (ObjectId) and enums.
  if (template) query.template = template;
  if (frequency) query.frequency = frequency;
  if (status === "active" || status === "inactive") query.status = status;
  if (
    programStatus &&
    ["planning", "in-progress", "completed", "on-hold", "cancelled"].includes(
      programStatus
    )
  ) {
    query.programStatus = programStatus;
  }

  // Filter for programs whose date range overlaps with the provided range.
  if (startDate)
    query.endDate = { ...query.endDate, $gte: new Date(startDate) };
  if (endDate)
    query.startDate = { ...query.startDate, $lte: new Date(endDate) };

  // Implement a case-insensitive text search across multiple relevant fields.
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [
      { name: searchRegex },
      { description: searchRegex },
      { responsibleDept: searchRegex },
    ];
  }

  if (responsibleDept && !search) {
    query.responsibleDept = { $regex: responsibleDept, $options: "i" };
  }

  // Execute the query, populating related documents for a complete response.
  const programs = await Program.find(query)
    .populate("template", "title version")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

  const count = await Program.countDocuments(query);

  res.status(200).json({
    data: programs,
    count: count,
    message: "Programs fetched successfully",
    success: true,
  });
});

/**
 * Retrieves a single program by its unique MongoDB ID.
 * Populates all related fields for detailed view.
 * @route GET /api/programs/:id
 */
export const getProgramById = asyncHandler(async (req, res, next) => {
  const program = await Program.findById(req.params.id)
    .populate("template", "title version")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!program) {
    throw new AppError("Program not found", 404);
  }

  res.status(200).json({
    data: program,
    message: "Program fetched successfully",
    success: true,
  });
});

/**
 * Creates a new program in the database.
 * Validates required fields and attaches creator information.
 * @route POST /api/programs
 */
export const createProgram = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    startDate,
    endDate,
    programStatus,
    template,
    frequency,
    responsibleDept,
  } = req.body;

  // Basic server-side validation for required fields.
  if (!name || !template) {
    throw new AppError("Name and Template are required fields.", 400);
  }

  const newProgram = new Program({
    name,
    description,
    startDate,
    endDate,
    programStatus,
    template,
    frequency,
    responsibleDept,
    ...createdBy(req),
  });

  let savedProgram = await newProgram.save();

  // Re-fetch the new document with populated relations for a complete response.
  savedProgram = await Program.findById(savedProgram._id)
    .populate("template", "title version")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    data: savedProgram,
    message: "Program created successfully",
    success: true,
  });
});

/**
 * Updates an existing program by its ID.
 * Allows partial updates and enforces schema validation.
 * @route PUT /api/programs/:id
 */
export const updateProgram = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    startDate,
    endDate,
    status,
    programStatus,
    template,
    frequency,
    responsibleDept,
  } = req.body;
  const programId = req.params.id;

  if (!name || !template) {
    throw new AppError("Name and Template are required fields.", 400);
  }

  // Build the update payload, only including fields that were sent in the request.
  const updateData = {
    name,
    description,
    startDate,
    endDate,
    template,
    frequency,
    responsibleDept,
    ...updatedBy(req),
  };

  // Conditionally update status fields to avoid accidental overrides if not provided.
  if (status === "active" || status === "inactive") {
    updateData.status = status;
  }
  if (
    programStatus &&
    ["planning", "in-progress", "completed", "on-hold", "cancelled"].includes(
      programStatus
    )
  ) {
    updateData.programStatus = programStatus;
  }

  // Find and update the document, returning the new version and enforcing schema validation.
  let updatedProgram = await Program.findByIdAndUpdate(programId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedProgram) {
    throw new AppError("Program not found", 404);
  }

  // Re-populate relations for the client response.
  updatedProgram = await Program.findById(updatedProgram._id)
    .populate("template", "title version")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedProgram,
    message: "Program updated successfully",
    success: true,
  });
});

/**
 * Permanently deletes a program from the database using its ID.
 * Note: This is a hard delete. Consider soft-deletes for data retention in production.
 * @route DELETE /api/programs/:id
 */
export const deleteProgram = asyncHandler(async (req, res, next) => {
  const deletedProgram = await Program.findByIdAndDelete(req.params.id);

  if (!deletedProgram) {
    throw new AppError("Program not found", 404);
  }

  res.status(200).json({
    message: "Program deleted successfully",
    success: true,
    data: deletedProgram,
  });
});
