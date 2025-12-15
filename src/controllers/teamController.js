// src/controllers/teamController.js

import Team from "../models/Team.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// GET /api/teams - With filtering, sorting, population based on new schema
export const getAllTeams = asyncHandler(async (req, res, next) => {
  // Step 1: Get filter values
  const { search, auditSession, user, roleInTeam, status } = req.query;

  // Step 2: Create query object
  const query = {};

  // Step 3: Add filters
  if (auditSession) query.auditSession = auditSession;
  if (user) query.user = user;
  if (roleInTeam) query.roleInTeam = roleInTeam;
  if (status === "active" || status === "inactive") query.status = status;

  // Step 4: Add search filter
  if (search && !roleInTeam) {
    const searchRegex = { $regex: search, $options: "i" };
    query.roleInTeam = searchRegex;
  }

  // Step 5: Find data, populate relationships, and sort
  const teams = await Team.find(query)
    .populate("auditSession", "title status")
    .populate("user", "name email role")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

  // Step 6: Count total matching documents
  const count = await Team.countDocuments(query);

  res.status(200).json({
    data: teams,
    count: count,
    message: "Team assignments fetched successfully",
    success: true,
  });
});

// GET /api/teams/:id - Update population and response format
export const getTeamById = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id)
    .populate("auditSession", "title status")
    .populate("user", "name email role")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!team) {
    throw new AppError("Team assignment not found", 404);
  }

  res.status(200).json({
    data: team,
    message: "Team assignment fetched successfully",
    success: true,
  });
});

// POST /api/teams - Update population, response format, error handling for index
export const createTeam = asyncHandler(async (req, res, next) => {
  const { auditSession, user, roleInTeam } = req.body;

  // Validation
  if (!auditSession || !user || !roleInTeam) {
    throw new AppError(
      "Audit session, user, and role in team are required",
      400
    );
  }

  // 🔒 Security Check: Only Lead Auditor or Admin can add members
  const session = await (
    await import("../models/AuditSession.js")
  ).default.findById(auditSession);
  if (!session) {
    throw new AppError("Audit session not found", 404);
  }

  const isLeadAuditor =
    session.leadAuditor &&
    session.leadAuditor.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin" || req.user.role === "sysadmin";

  if (!isLeadAuditor && !isAdmin) {
    return next(
      new AppError("Only the Lead Auditor or Admin can add team members.", 403)
    );
  }

  const newTeam = new Team({
    auditSession,
    user,
    roleInTeam,
    ...createdBy(req),
  });

  let savedTeam = await newTeam.save();

  // Repopulate for response
  savedTeam = await Team.findById(savedTeam._id)
    .populate("auditSession", "title status")
    .populate("user", "name email role")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    data: savedTeam,
    message: "Team assignment created successfully",
    success: true,
  });
});

// PUT /api/teams/:id - Update population, response format, error handling for index
export const updateTeam = asyncHandler(async (req, res, next) => {
  const { auditSession, user, roleInTeam, status } = req.body;
  const teamId = req.params.id;

  // Validation
  if (!auditSession || !user || !roleInTeam) {
    throw new AppError(
      "Audit session, user, and role in team are required",
      400
    );
  }

  const updateData = {
    auditSession,
    user,
    roleInTeam,
    ...updatedBy(req),
  };
  if (status === "active" || status === "inactive") updateData.status = status;

  let updatedTeam = await Team.findByIdAndUpdate(teamId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedTeam) {
    throw new AppError("Team assignment not found", 404);
  }

  // Repopulate for response
  updatedTeam = await Team.findById(updatedTeam._id)
    .populate("auditSession", "title status")
    .populate("user", "name email role")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedTeam,
    message: "Team assignment updated successfully",
    success: true,
  });
});

// DELETE /api/teams/:id - Update response format
export const deleteTeam = asyncHandler(async (req, res, next) => {
  const teamMember = await Team.findById(req.params.id);

  if (!teamMember) {
    throw new AppError("Team assignment not found", 404);
  }

  // 🔒 Security Check
  const session = await (
    await import("../models/AuditSession.js")
  ).default.findById(teamMember.auditSession);
  if (session) {
    const isLeadAuditor =
      session.leadAuditor &&
      session.leadAuditor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin" || req.user.role === "sysadmin";

    if (!isLeadAuditor && !isAdmin) {
      return next(
        new AppError(
          "Only the Lead Auditor or Admin can remove team members.",
          403
        )
      );
    }
  }

  await teamMember.deleteOne();

  res.status(200).json({
    message: "Team assignment deleted successfully",
    success: true,
    data: teamMember,
  });
});
