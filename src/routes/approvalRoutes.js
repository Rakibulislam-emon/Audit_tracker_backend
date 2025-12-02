// src/routes/approvalRoutes.js

import { Router } from "express";
import { can } from "../config/permissions.js";
import * as approvalController from "../controllers/approvalController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// GET /api/approvals - View All (Admin/Manager view)
router.get(
  "/",
  auth,
  authorizeRoles(...can("APPROVAL", "VIEW")),
  approvalController.getAllApprovals
);

// GET /api/approvals/my-approvals - View user's own queue
router.get("/my-approvals", auth, approvalController.getMyApprovals);

// GET /api/approvals/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("APPROVAL", "VIEW")),
  approvalController.getApprovalById
);

// POST /api/approvals - Create Approval Request
router.post(
  "/",
  auth,
  authorizeRoles(...can("APPROVAL", "CREATE")),
  approvalController.createApproval
);

// PUT /api/approvals/:id - Update basic info
router.put(
  "/:id",
  auth,
  authorizeRoles(...can("APPROVAL", "UPDATE")),
  approvalController.updateApproval
);

// PATCH /api/approvals/:id - Partial update
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("APPROVAL", "UPDATE")),
  approvalController.updateApproval
);

// DELETE /api/approvals/:id - Delete approval
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("APPROVAL", "DELETE")),
  approvalController.deleteApproval
);

// --- Approval Actions (Specific to Approvers/Users) ---

// POST /api/approvals/:id/approve - Approve
router.post(
  "/:id/approve",
  auth,
  authorizeRoles(...can("APPROVAL", "APPROVE")),
  approvalController.approveRequest
);

// POST /api/approvals/:id/reject - Reject
router.post(
  "/:id/reject",
  auth,
  authorizeRoles(...can("APPROVAL", "REJECT")),
  approvalController.rejectRequest
);

// POST /api/approvals/:id/escalate - Escalate
router.post(
  "/:id/escalate",
  auth,
  authorizeRoles(...can("APPROVAL", "APPROVE")),
  approvalController.escalateRequest
);

// PATCH /api/approvals/:id/requirement - Update requirement checklist
router.patch(
  "/:id/requirement",
  auth,
  authorizeRoles(...can("APPROVAL", "UPDATE")),
  approvalController.updateRequirement
);

// POST /api/approvals/:id/comment - Add comment to history
router.post(
  "/:id/comment",
  auth,
  authorizeRoles(...can("APPROVAL", "VIEW")),
  approvalController.addComment
);

// POST /api/approvals/bulk/approve - Bulk approve multiple requests
router.post(
  "/bulk/approve",
  auth,
  authorizeRoles(...can("APPROVAL", "APPROVE")),
  approvalController.bulkApproveRequests
);

// POST /api/approvals/bulk/reject - Bulk reject multiple requests
router.post(
  "/bulk/reject",
  auth,
  authorizeRoles(...can("APPROVAL", "APPROVE")),
  approvalController.bulkRejectRequests
);

export default router;
