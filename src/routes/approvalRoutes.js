import { Router } from "express";
import * as approvalController from "../controllers/approvalController.js";

const router = Router();

// Basic CRUD routes
router.get("/", approvalController.getAllApprovals);
router.get("/my-approvals", approvalController.getMyApprovals);
router.get("/:id", approvalController.getApprovalById);
router.post("/", approvalController.createApproval);
router.put("/:id", approvalController.updateApproval);

// Approval actions
router.post("/:id/approve", approvalController.approveRequest);
router.post("/:id/reject", approvalController.rejectRequest);
router.post("/:id/escalate", approvalController.escalateRequest);

// Additional actions
router.patch("/:id/requirement", approvalController.updateRequirement);
router.post("/:id/comment", approvalController.addComment);

export default router;
