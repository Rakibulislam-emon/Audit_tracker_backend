// src/routes/approvalRoutes.js - COMPLETE VERSION

import { Router } from "express";
import * as approvalController from "../controllers/approvalController.js";
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
const manageRoles = ["admin", "sysadmin", "audit_manager"];
const approverRoles = [
  "admin",
  "sysadmin",
  "audit_manager",
  "auditor",
  "compliance_officer",
];
const adminOnly = ["admin", "sysadmin"];

// --- Approval Routes ---

// GET /api/approvals - View All (Admin/Manager view)
router.get(
  "/",
  auth,
  authorizeRoles(...manageRoles),
  approvalController.getAllApprovals
);

// GET /api/approvals/my-approvals - View user's own queue
router.get("/my-approvals", auth, approvalController.getMyApprovals);

// GET /api/approvals/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...viewRoles),
  approvalController.getApprovalById
);

// POST /api/approvals - Create Approval Request
router.post(
  "/",
  auth,
  authorizeRoles(...manageRoles),
  approvalController.createApproval
);

// PUT /api/approvals/:id - Update basic info
router.put(
  "/:id",
  auth,
  authorizeRoles(...manageRoles),
  approvalController.updateApproval
);

// ✅ ADDED: PATCH /api/approvals/:id - Partial update (if your frontend uses PATCH)
router.patch(
  "/:id",
  auth,
  authorizeRoles(...manageRoles),
  approvalController.updateApproval
);

// ✅ ADDED: DELETE /api/approvals/:id - Delete approval
router.delete(
  "/:id",
  auth,
  authorizeRoles(...adminOnly),
  approvalController.deleteApproval
);

// --- Approval Actions (Specific to Approvers/Users) ---

// POST /api/approvals/:id/approve - Approve
router.post("/:id/approve", auth, approvalController.approveRequest);

// POST /api/approvals/:id/reject - Reject
router.post("/:id/reject", auth, approvalController.rejectRequest);

// POST /api/approvals/:id/escalate - Escalate
router.post("/:id/escalate", auth, approvalController.escalateRequest);

// PATCH /api/approvals/:id/requirement - Update requirement checklist
router.patch("/:id/requirement", auth, approvalController.updateRequirement);

// POST /api/approvals/:id/comment - Add comment to history
router.post(
  "/:id/comment",
  auth,
  authorizeRoles(...viewRoles),
  approvalController.addComment
);

// POST /api/approvals/bulk/approve - Bulk approve multiple requests
router.post('/bulk/approve', auth, approvalController.bulkApproveRequests);

// POST /api/approvals/bulk/reject - Bulk reject multiple requests  
router.post('/bulk/reject', auth, approvalController.bulkRejectRequests);

export default router;
