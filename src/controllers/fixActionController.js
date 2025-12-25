// src/controllers/fixActionController.js

import FixAction from "../models/FixAction.js";
import Problem from "../models/Problem.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// GET /api/fix-actions - With filtering, sorting, population
export const getAllFixActions = asyncHandler(async (req, res, next) => {
  // Step 1: Get filter values
  const { search, problem, owner, status, actionStatus, verificationResult } =
    req.query;

  // Step 2: Create query object
  const query = {};

  // Step 3: Add filters
  if (problem) query.problem = problem;
  if (owner) query.owner = owner;
  if (status === "active" || status === "inactive") query.status = status;
  if (
    actionStatus &&
    ["Pending", "In Progress", "Completed", "Verified", "Rejected"].includes(
      actionStatus
    )
  ) {
    query.actionStatus = actionStatus;
  }
  if (
    verificationResult &&
    [
      "Effective",
      "Ineffective",
      "Partially Effective",
      "Not Applicable",
      "Pending Verification",
    ].includes(verificationResult)
  ) {
    query.verificationResult = verificationResult;
  }

  // Step 4: Add search filter
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [{ actionText: searchRegex }, { reviewNotes: searchRegex }];
  }

  // Step 5: Find data, populate relationships, and sort
  const fixActions = await FixAction.find(query)
    .populate("problem", "title problemStatus")
    .populate("observation", "questionText severity")
    .populate("owner", "name email")
    .populate("verifiedBy", "name email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ deadline: 1 });

  // Step 6: Count total matching documents
  const count = await FixAction.countDocuments(query);

  res.status(200).json({
    data: fixActions,
    count: count,
    message: "Fix actions fetched successfully",
    success: true,
  });
});

// GET /api/fix-actions/:id - Update population
export const getFixActionById = asyncHandler(async (req, res, next) => {
  const fixAction = await FixAction.findById(req.params.id)
    .populate("problem", "title problemStatus")
    .populate("observation", "questionText severity")
    .populate("owner", "name email")
    .populate("verifiedBy", "name email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!fixAction) {
    throw new AppError("Fix action not found", 404);
  }

  res.status(200).json({
    data: fixAction,
    message: "Fix action fetched successfully",
    success: true,
  });
});

import Approval from "../models/Approval.js";
import { resolveApproverByBusinessRules } from "../utils/approvalResolver.js";

// ... [existing imports]

// POST /api/fix-actions - Include new fields, updated error handling, link to Problem
export const createFixAction = asyncHandler(async (req, res, next) => {
  const {
    problem,
    actionText,
    owner,
    deadline,
    actionStatus,
    reviewNotes,
    verificationMethod,
    rootCause,
    correctiveAction,
    preventiveAction,
  } = req.body;

  // Validation
  if (!problem || !owner || !deadline) {
    throw new AppError("Problem, Owner, and Deadline are required", 400);
  }

  const newFixAction = new FixAction({
    problem,
    actionText: actionText || `Fix for Problem ${problem}`,
    owner,
    deadline,
    actionStatus: actionStatus || "Pending",
    reviewNotes,
    verificationMethod,
    rootCause,
    correctiveAction,
    preventiveAction,
    ...createdBy(req),
  });

  let savedFixAction = await newFixAction.save();

  // 1. Link this FixAction back to the Problem document
  // 2. Update Problem Status to 'In Progress'
  await Problem.findByIdAndUpdate(problem, {
    $addToSet: { fixActions: savedFixAction._id },
    $set: { problemStatus: "In Progress" }, // Changed from "fix_submitted" to "In Progress"
  });

  // 3. Create an Approval Request for this Fix Action
  try {
    // Use the standard resolver to find the right approver
    const approverId = await resolveApproverByBusinessRules(
      { title: actionText }, // Fake report object for Title logging
      req.user._id,
      req
    );

    const approval = new Approval({
      entityType: "FixAction",
      entityId: savedFixAction._id,
      title: `Approval for CAPA: ${actionText || "Fix Action"}`,
      description: `Review corrective/preventive actions for problem: ${problem}`,
      requestedBy: req.user._id,
      approver: approverId, // Explicitly assign approver
      status: "active", // FIXED: 'status' must be 'active' or 'inactive'. 'approvalStatus' is 'pending'.
      approvalStatus: "pending", // Ensure this enum is set
      priority: "high",
      requirements: [
        { description: "Manager functional review", completed: false },
      ],
      timeline: {
        requestedAt: new Date(),
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      ...createdBy(req), // Add creator metadata
    });

    // Add initial history
    approval.reviewHistory.push({
      reviewedBy: req.user._id,
      action: "submitted",
      comments: "CAPA submitted for approval",
      reviewedAt: new Date(),
    });

    await approval.save();
  } catch (err) {
    console.error("Failed to auto-create approval:", err);
    // Don't fail the request, just log it.
    // In prod, might want to rollback or alert.
  }

  // Repopulate for response
  savedFixAction = await FixAction.findById(savedFixAction._id)
    .populate("problem", "title problemStatus")
    .populate("observation", "questionText severity")
    .populate("owner", "name email")
    .populate("verifiedBy", "name email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    data: savedFixAction,
    message: "Fix action created successfully",
    success: true,
  });
});

// PUT /api/fix-actions/:id - Include new fields, updated error handling
export const updateFixAction = asyncHandler(async (req, res, next) => {
  const {
    problem,
    actionText,
    owner,
    deadline,
    status,
    actionStatus,
    reviewNotes,
    verificationMethod,
    verifiedBy,
    verifiedAt,
    verificationResult,
  } = req.body;
  const fixActionId = req.params.id;

  // Validation
  if (!problem || !actionText || !owner || !deadline) {
    throw new AppError(
      "Problem, Action Text, Owner, and Deadline cannot be empty",
      400
    );
  }

  // Build update object dynamically
  const updateData = { ...updatedBy(req) };
  updateData.problem = problem;
  updateData.actionText = actionText;
  updateData.owner = owner;
  updateData.deadline = deadline;

  if (actionStatus) updateData.actionStatus = actionStatus;
  if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes;
  if (verificationMethod !== undefined)
    updateData.verificationMethod = verificationMethod;
  if (verifiedBy !== undefined) updateData.verifiedBy = verifiedBy || null;
  if (verifiedAt !== undefined) updateData.verifiedAt = verifiedAt || null;
  if (verificationResult !== undefined)
    updateData.verificationResult = verificationResult || null;
  if (status === "active" || status === "inactive") updateData.status = status;

  // Find the old problem ID *before* updating
  const oldFixAction = await FixAction.findById(fixActionId).select("problem");

  let updatedFixAction = await FixAction.findByIdAndUpdate(
    fixActionId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!updatedFixAction) {
    throw new AppError("Fix action not found", 404);
  }

  // If the related 'problem' was changed, update both old and new Problem documents
  if (
    oldFixAction &&
    oldFixAction.problem &&
    !oldFixAction.problem.equals(updatedFixAction.problem)
  ) {
    // Remove from old problem
    await Problem.findByIdAndUpdate(oldFixAction.problem, {
      $pull: { fixActions: updatedFixAction._id },
    });
    // Add to new problem
    await Problem.findByIdAndUpdate(updatedFixAction.problem, {
      $addToSet: { fixActions: updatedFixAction._id },
    });
  } else if (updatedFixAction.problem) {
    // Ensure it's in the correct problem's list
    await Problem.findByIdAndUpdate(updatedFixAction.problem, {
      $addToSet: { fixActions: updatedFixAction._id },
    });
  }

  // Repopulate for response
  updatedFixAction = await FixAction.findById(updatedFixAction._id)
    .populate("problem", "title problemStatus")
    .populate("observation", "questionText severity")
    .populate("owner", "name email")
    .populate("verifiedBy", "name email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedFixAction,
    message: "Fix action updated successfully",
    success: true,
  });
});

// DELETE /api/fix-actions/:id - Also remove link from Problem
export const deleteFixAction = asyncHandler(async (req, res, next) => {
  const deletedFixAction = await FixAction.findByIdAndDelete(req.params.id);
  if (!deletedFixAction) {
    throw new AppError("Fix action not found", 404);
  }

  // Remove the link from the related Problem document
  if (deletedFixAction.problem) {
    await Problem.findByIdAndUpdate(deletedFixAction.problem, {
      $pull: { fixActions: deletedFixAction._id },
    });
  }

  res.status(200).json({
    message: "Fix action deleted successfully",
    success: true,
    data: deletedFixAction,
  });
});
