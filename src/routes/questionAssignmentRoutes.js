import { Router } from "express";
import * as assignmentController from "../controllers/questionAssignmentController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { can } from "../config/permissions.js";

const router = Router();

// Apply auth middleware to all routes
router.use(auth);

// POST - Assign Question (Lead Auditor/Admin/Manager)
router.post(
  "/",
  authorizeRoles(...can("QUESTION_ASSIGNMENT", "ASSIGN")),
  assignmentController.assignQuestion
);

// GET - All Assignments for Session (Team members can view)
router.get(
  "/:sessionId",
  authorizeRoles(...can("QUESTION_ASSIGNMENT", "VIEW")),
  assignmentController.getAssignmentsForSession
);

// GET - My Assignments (Team members can view own)
router.get(
  "/:sessionId/mine",
  authorizeRoles(...can("QUESTION_ASSIGNMENT", "VIEW")),
  assignmentController.getMyAssignments
);

// DELETE - Remove Assignment
router.delete(
  "/:id",
  authorizeRoles(...can("QUESTION_ASSIGNMENT", "UNASSIGN")),
  assignmentController.deleteAssignment
);

export default router;
