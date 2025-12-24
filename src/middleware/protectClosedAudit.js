// src/middleware/protectClosedAudit.js

import AuditSession from "../models/AuditSession.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

/**
 * Middleware to protect closed/locked audits from modification
 * Allows admin roles to override for emergency corrections
 */
export const protectClosedAudit = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Only applicable to modify operations (PUT, PATCH, DELETE)
  if (!["PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next();
  }

  // Find the audit session
  const audit = await AuditSession.findById(id);

  if (!audit) {
    // If audit not found, let the controller handle it
    return next();
  }

  // Check if audit is locked or completed
  const isAuditLocked = audit.isLocked || audit.workflowStatus === "completed";

  if (isAuditLocked) {
    // Define roles that can override the lock
    const adminRoles = ["admin", "sysadmin", "superAdmin", "complianceOfficer"];

    // Check if user has admin override permission
    if (!adminRoles.includes(req.user?.role)) {
      throw new AppError(
        "This audit is closed and cannot be modified. Contact an administrator if changes are required.",
        403
      );
    }

    // Log admin override for audit trail
    console.warn(
      `⚠️  ADMIN OVERRIDE: ${req.user.email} (${req.user.role}) is modifying locked audit ${id}`
    );
  }

  // Allow the request to proceed
  next();
});
