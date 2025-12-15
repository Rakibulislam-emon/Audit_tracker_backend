import QuestionAssignment from "../models/QuestionAssignment.js";
import AuditSession from "../models/AuditSession.js";
import Team from "../models/Team.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * @desc    Assign a question to an auditor
 * @route   POST /api/question-assignments
 * @access  Private (Lead Auditor/Admin)
 */
export const assignQuestion = asyncHandler(async (req, res, next) => {
  const { auditSession, question, assignedTo } = req.body;

  // 1. Check if session exists
  const session = await AuditSession.findById(auditSession);
  if (!session) {
    return next(new AppError("Audit Session not found", 404));
  }

  // 🔒 Security Check: Only Lead Auditor or Admin can assign
  const isLeadAuditor =
    session.leadAuditor &&
    session.leadAuditor.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin" || req.user.role === "sysadmin";

  if (!isLeadAuditor && !isAdmin) {
    return next(
      new AppError("Only the Lead Auditor or Admin can assign questions.", 403)
    );
  }

  // 2. Check if assigned user is part of the team
  const isTeamMember = await Team.findOne({
    auditSession,
    user: assignedTo,
  });

  if (!isTeamMember) {
    return next(new AppError("User is not a member of this audit team", 400));
  }

  // 3. Create or Update Assignment
  // Using findOneAndUpdate with upsert to handle re-assignment easily
  const assignment = await QuestionAssignment.findOneAndUpdate(
    { auditSession, question },
    {
      auditSession,
      question,
      assignedTo,
      assignedBy: req.user._id, // Current user (Lead Auditor)
    },
    { new: true, upsert: true, runValidators: true }
  ).populate("assignedTo", "name email role");

  res.status(200).json({
    success: true,
    data: assignment,
    message: "Question assigned successfully",
  });
});

/**
 * @desc    Get all assignments for a session
 * @route   GET /api/question-assignments/:sessionId
 * @access  Private (Team Members)
 */
export const getAssignmentsForSession = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;

  const assignments = await QuestionAssignment.find({
    auditSession: sessionId,
  }).populate("assignedTo", "name email");

  res.status(200).json({
    success: true,
    count: assignments.length,
    data: assignments,
  });
});

/**
 * @desc    Get my assignments for a session
 * @route   GET /api/question-assignments/:sessionId/mine
 * @access  Private (Auditor)
 */
export const getMyAssignments = asyncHandler(async (req, res, next) => {
  const { sessionId } = req.params;

  const assignments = await QuestionAssignment.find({
    auditSession: sessionId,
    assignedTo: req.user._id,
  });

  res.status(200).json({
    success: true,
    count: assignments.length,
    data: assignments,
  });
});

/**
 * @desc    Remove an assignment
 * @route   DELETE /api/question-assignments/:id
 * @access  Private (Lead Auditor/Admin)
 */
export const deleteAssignment = asyncHandler(async (req, res, next) => {
  const assignment = await QuestionAssignment.findById(req.params.id);

  if (!assignment) {
    return next(new AppError("Assignment not found", 404));
  }

  // 🔒 Security Check: Only Lead Auditor or Admin can unassign
  const session = await AuditSession.findById(assignment.auditSession);

  // If session is missing (orphan assignment?), allow admin to delete, but otherwise block
  if (session) {
    const isLeadAuditor =
      session.leadAuditor &&
      session.leadAuditor.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin" || req.user.role === "sysadmin";

    if (!isLeadAuditor && !isAdmin) {
      return next(
        new AppError(
          "Only the Lead Auditor or Admin can remove assignments.",
          403
        )
      );
    }
  }

  await assignment.deleteOne();

  res.status(200).json({
    success: true,
    message: "Assignment removed",
  });
});
