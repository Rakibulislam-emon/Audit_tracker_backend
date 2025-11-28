// src/controllers/problemController.js

import Problem from "../models/Problem.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// GET /api/problems - With filtering, sorting, population based on new schema
export const getAllProblems = asyncHandler(async (req, res, next) => {
  // Step 1: Get filter values
  const {
    search,
    auditSession,
    observation,
    question,
    status,
    problemStatus,
    impact,
    likelihood,
    riskRating,
  } = req.query;

  // Step 2: Create query object
  const query = {};

  // Step 3: Add filters
  if (auditSession) query.auditSession = auditSession;
  if (observation) query.observation = observation;
  if (question) query.question = question;
  if (status === "active" || status === "inactive") query.status = status;
  if (
    problemStatus &&
    ["Open", "In Progress", "Resolved", "Closed"].includes(problemStatus)
  ) {
    query.problemStatus = problemStatus;
  }
  // Filters for impact, likelihood, riskRating
  if (impact && ["Low", "Medium", "High"].includes(impact))
    query.impact = impact;
  if (
    likelihood &&
    ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"].includes(
      likelihood
    )
  )
    query.likelihood = likelihood;
  if (riskRating && ["Low", "Medium", "High", "Critical"].includes(riskRating))
    query.riskRating = riskRating;

  // Step 4: Add search filter
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [{ title: searchRegex }, { description: searchRegex }];
  }

  // Step 5: Find data, populate relationships, and sort
  const problems = await Problem.find(query)
    .populate("auditSession", "title")
    .populate("observation", "_id severity response")
    .populate("question", "questionText")
    .populate("fixActions", "_id title status")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

  // Step 6: Count total matching documents
  const count = await Problem.countDocuments(query);

  res.status(200).json({
    data: problems,
    count: count,
    message: "Problems fetched successfully",
    success: true,
  });
});

// GET /api/problems/:id - Update population
export const getProblemById = asyncHandler(async (req, res, next) => {
  const problem = await Problem.findById(req.params.id)
    .populate("auditSession", "title")
    .populate("observation", "_id severity resolutionStatus response")
    .populate("question", "questionText")
    .populate("fixActions", "_id title status")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!problem) {
    throw new AppError("Problem not found", 404);
  }

  res.status(200).json({
    data: problem,
    message: "Problem fetched successfully",
    success: true,
  });
});

// POST /api/problems - Include new fields, updated error handling
export const createProblem = asyncHandler(async (req, res, next) => {
  // Include new fields from schema
  const {
    auditSession,
    observation,
    question,
    title,
    description,
    impact,
    likelihood,
    riskRating,
    problemStatus,
    fixActions,
  } = req.body;

  // Validation
  if (
    !auditSession ||
    !title ||
    !description ||
    !impact ||
    !likelihood ||
    !riskRating
  ) {
    throw new AppError(
      "Audit Session, Title, Description, Impact, Likelihood, and Risk Rating are required",
      400
    );
  }

  // Check for duplicates (manual check as no unique index)
  const existingProblem = await Problem.findOne({ auditSession, title });
  if (existingProblem) {
    throw new AppError(
      "Problem with the same audit session and title already exists",
      400
    );
  }

  const newProblem = new Problem({
    auditSession,
    observation: observation || null,
    question: question || null,
    title,
    description,
    impact,
    likelihood,
    riskRating,
    problemStatus: problemStatus || "Open",
    fixActions: fixActions || [],
    ...createdBy(req),
  });

  let savedProblem = await newProblem.save();

  // Repopulate for response
  savedProblem = await Problem.findById(savedProblem._id)
    .populate("auditSession", "title")
    .populate("observation", "_id severity resolutionStatus response")
    .populate("question", "questionText")
    .populate("fixActions", "_id title status")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    data: savedProblem,
    message: "Problem created successfully",
    success: true,
  });
});

// PATCH /api/problems/:id - Include new fields, updated error handling
export const updateProblem = asyncHandler(async (req, res, next) => {
  const {
    auditSession,
    observation,
    question,
    title,
    description,
    impact,
    likelihood,
    riskRating,
    status,
    problemStatus,
    fixActions,
  } = req.body;
  const problemId = req.params.id;

  // Validation
  if (
    !auditSession ||
    !title ||
    !description ||
    !impact ||
    !likelihood ||
    !riskRating
  ) {
    throw new AppError(
      "Audit Session, Title, Description, Impact, Likelihood, and Risk Rating cannot be empty",
      400
    );
  }

  // Build update object dynamically
  const updateData = { ...updatedBy(req) };
  // Required fields
  updateData.auditSession = auditSession;
  updateData.title = title;
  updateData.description = description;
  updateData.impact = impact;
  updateData.likelihood = likelihood;
  updateData.riskRating = riskRating;
  // Optional/Updatable fields
  if (observation !== undefined) updateData.observation = observation || null;
  if (question !== undefined) updateData.question = question || null;
  if (problemStatus) updateData.problemStatus = problemStatus;
  if (fixActions !== undefined) updateData.fixActions = fixActions || [];
  if (status === "active" || status === "inactive") updateData.status = status;

  let updatedProblem = await Problem.findByIdAndUpdate(problemId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedProblem) {
    throw new AppError("Problem not found", 404);
  }

  // Repopulate for response
  updatedProblem = await Problem.findById(updatedProblem._id)
    .populate("auditSession", "title")
    .populate("observation", "_id severity resolutionStatus response")
    .populate("question", "questionText")
    .populate("fixActions", "_id title status")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedProblem,
    message: "Problem updated successfully",
    success: true,
  });
});

// DELETE /api/problems/:id - Standard response
export const deleteProblem = asyncHandler(async (req, res, next) => {
  const deletedProblem = await Problem.findByIdAndDelete(req.params.id);
  if (!deletedProblem) {
    throw new AppError("Problem not found", 404);
  }
  res.status(200).json({
    message: "Problem deleted successfully",
    success: true,
    data: deletedProblem,
  });
});
