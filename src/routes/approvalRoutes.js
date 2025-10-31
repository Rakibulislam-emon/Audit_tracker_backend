// src/routes/approvalRoutes.js

import { Router } from "express";
import * as approvalController from "../controllers/approvalController.js";
// ✅ Middleware Imports (without curly braces)
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// --- Define Roles for Readability ---
const viewRoles = [
  "admin",
  "sysadmin",
  "audit_manager",
  "auditor",
  "compliance_officer",
];
const manageRoles = ["admin", "sysadmin", "audit_manager"]; // Can create/update basic info
const approverRoles = [
  "admin",
  "sysadmin",
  "audit_manager",
  "auditor",
  "compliance_officer",
]; // Who can be an approver
const adminOnly = ["admin", "sysadmin"];

// --- Approval Routes ---

// GET /api/approvals - View All (Admin/Manager view)
router.get(
  "/",
  auth,
  authorizeRoles(...manageRoles), // Only managers/admins see the full list
  approvalController.getAllApprovals
);

// GET /api/approvals/my-approvals - View user's own queue
router.get(
  "/my-approvals",
  auth, // Any logged-in user can check their queue
  approvalController.getMyApprovals
);

// GET /api/approvals/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...viewRoles), // Anyone involved can view
  approvalController.getApprovalById
);

// POST /api/approvals - Create Approval Request (Triggered by other modules)
router.post(
  "/",
  auth,
  authorizeRoles(...manageRoles), // Only managers/admins can initiate approvals
  approvalController.createApproval
);

// PUT /api/approvals/:id - Update basic info (e.g., deadline, title)
router.put(
  "/:id",
  auth,
  authorizeRoles(...manageRoles), // Only managers/admins can edit
  approvalController.updateApproval
);

// --- Approval Actions (Specific to Approvers/Users) ---

// POST /api/approvals/:id/approve - Approve
router.post(
  "/:id/approve",
  auth, // Controller verifies if user is the *specific* approver
  approvalController.approveRequest
);

// POST /api/approvals/:id/reject - Reject
router.post(
  "/:id/reject",
  auth, // Controller verifies if user is the *specific* approver
  approvalController.rejectRequest
);

// POST /api/approvals/:id/escalate - Escalate
router.post(
  "/:id/escalate",
  auth, // Controller verifies if user is the *specific* approver
  approvalController.escalateRequest
);

// PATCH /api/approvals/:id/requirement - Update requirement checklist
router.patch(
  "/:id/requirement",
  auth, // Any authenticated user (like requester or approver)
  approvalController.updateRequirement
);

// POST /api/approvals/:id/comment - Add comment to history
router.post(
  "/:id/comment",
  auth,
  authorizeRoles(...viewRoles), // Anyone who can view can comment
  approvalController.addComment
);

// Note: No DELETE route added by default as per user's file.
// If needed, add:
// router.delete('/:id', auth, authorizeRoles(...adminOnly), approvalController.deleteApproval);

export default router;
