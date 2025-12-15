// src/controllers/observationController.js

import Observation from "../models/Observation.js";
import QuestionAssignment from "../models/QuestionAssignment.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// GET /api/observations - With filtering, sorting, population
export const getAllObservations = asyncHandler(async (req, res, next) => {
  // Step 1: Get filter values
  const { search, auditSession, question, status, resolutionStatus, severity } =
    req.query;

  // Step 2: Create query object
  const query = {};

  // Step 3: Add filters
  if (auditSession) query.auditSession = auditSession;
  if (question) query.question = question;
  if (status === "active" || status === "inactive") query.status = status;
  if (
    resolutionStatus &&
    [
      "Open",
      "In Progress",
      "Resolved",
      "Closed - Verified",
      "Closed - Risk Accepted",
    ].includes(resolutionStatus)
  ) {
    query.resolutionStatus = resolutionStatus;
  }
  if (
    severity &&
    ["Informational", "Low", "Medium", "High", "Critical"].includes(severity)
  ) {
    query.severity = severity;
  }

  // Step 4: Add search filter
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [{ questionText: searchRegex }, { response: searchRegex }];
  }

  // Step 5: Find data, populate relationships, and sort
  const observations = await Observation.find(query)
    .populate("auditSession", "title")
    .populate("question", "questionText responseType")
    .populate("problem", "problemId title")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

  // Step 6: Count total matching documents
  const count = await Observation.countDocuments(query);

  res.status(200).json({
    data: observations,
    count: count,
    message: "Observations fetched successfully",
    success: true,
  });
});

// GET /api/observations/:id - Update population
export const getObservationById = asyncHandler(async (req, res, next) => {
  const observation = await Observation.findById(req.params.id)
    .populate("auditSession", "title")
    .populate("question", "questionText responseType")
    .populate("problem", "problemId title")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!observation) {
    throw new AppError("Observation not found", 404);
  }

  res.status(200).json({
    data: observation,
    message: "Observation fetched successfully",
    success: true,
  });
});

// POST /api/observations - Handle new fields, updated error handling
export const createObservation = asyncHandler(async (req, res, next) => {
  const {
    auditSession,
    question,
    questionText,
    response,
    severity,
    resolutionStatus,
    problem,
  } = req.body;

  // Validation
  if (!auditSession || !questionText) {
    throw new AppError(
      "Audit Session and Observation details (question text) are required",
      400
    );
  }

  // ✅ Check for Question Assignment
  if (question) {
    const assignment = await QuestionAssignment.findOne({
      auditSession,
      question,
    });

    if (assignment) {
      // Check if current user is the assignee (or admin/sysadmin override)
      const isAssignedUser =
        assignment.assignedTo.toString() === req.user._id.toString();
      const isAdmin = ["admin", "sysadmin"].includes(req.user.role);

      if (!isAssignedUser && !isAdmin) {
        throw new AppError(
          "You are not assigned to answer this question.",
          403
        );
      }
    }
  }

  const newObservation = new Observation({
    auditSession,
    question: question || null,
    questionText,
    response,
    severity,
    resolutionStatus: resolutionStatus || "Open",
    problem: problem || null,
    ...createdBy(req),
  });

  let savedObservation = await newObservation.save();

  // Repopulate for response
  savedObservation = await Observation.findById(savedObservation._id)
    .populate("auditSession", "title")
    .populate("question", "questionText responseType")
    .populate("problem", "problemId title")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    data: savedObservation,
    message: "Observation created successfully",
    success: true,
  });
});

// PUT /api/observations/:id - Handle new fields, updated error handling
export const updateObservation = asyncHandler(async (req, res, next) => {
  const {
    auditSession,
    question,
    questionText,
    response,
    severity,
    status,
    resolutionStatus,
    problem,
  } = req.body;
  const observationId = req.params.id;

  // Basic Validation
  if (!auditSession || !questionText) {
    throw new AppError(
      "Audit Session and Observation details (question text) cannot be empty",
      400
    );
  }

  // Build update object dynamically
  const updateData = { ...updatedBy(req) };
  updateData.auditSession = auditSession;
  updateData.questionText = questionText;

  if (question !== undefined) updateData.question = question || null;
  if (response !== undefined) updateData.response = response;
  if (severity !== undefined) updateData.severity = severity || null;
  if (status === "active" || status === "inactive") updateData.status = status;
  if (resolutionStatus) updateData.resolutionStatus = resolutionStatus;
  if (problem !== undefined) updateData.problem = problem || null;

  // ✅ Check for Question Assignment (for updates)
  // We need to know the session and question to check assignment.
  // If not provided in body, we might need to fetch from existing observation,
  // but efficient way is to assume frontend sends them or we verify against existing.

  // Fetch existing to ensure we have the correct session/question for checking
  const existingObservation = await Observation.findById(observationId);
  if (!existingObservation) {
    throw new AppError("Observation not found", 404);
  }

  const targetSession = auditSession || existingObservation.auditSession;
  const targetQuestion = question || existingObservation.question;

  if (targetQuestion) {
    const assignment = await QuestionAssignment.findOne({
      auditSession: targetSession,
      question: targetQuestion,
    });

    if (assignment) {
      const isAssignedUser =
        assignment.assignedTo.toString() === req.user._id.toString();
      const isAdmin = ["admin", "sysadmin"].includes(req.user.role);

      if (!isAssignedUser && !isAdmin) {
        throw new AppError("You are not assigned to modify this answer.", 403);
      }
    }
  }

  let updatedObservation = await Observation.findByIdAndUpdate(
    observationId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!updatedObservation) {
    throw new AppError("Observation not found", 404);
  }

  // Repopulate for response
  updatedObservation = await Observation.findById(updatedObservation._id)
    .populate("auditSession", "title")
    .populate("question", "questionText responseType")
    .populate("problem", "problemId title")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedObservation,
    message: "Observation updated successfully",
    success: true,
  });
});

// DELETE /api/observations/:id - Standard response
export const deleteObservation = asyncHandler(async (req, res, next) => {
  const deletedObservation = await Observation.findByIdAndDelete(req.params.id);
  if (!deletedObservation) {
    throw new AppError("Observation not found", 404);
  }
  res.status(200).json({
    message: "Observation deleted successfully",
    success: true,
    data: deletedObservation,
  });
});
