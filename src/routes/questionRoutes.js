// src/routes/questionRoutes.js

import { Router } from "express";
import * as questionController from "../controllers/questionController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// --- Question Routes ---
// Assuming standard permissions for now, adjust based on your dynamicConfig

// GET /api/questions - View All
router.get(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Common view roles
  questionController.getAllQuestions
);

// GET /api/questions/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Common view roles
  questionController.getQuestionById
);

// POST /api/questions - Create
router.post(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager"), // Common create/edit roles
  questionController.createQuestion
);

// PUT /api/questions/:id - Update
router.patch(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager"), // Common create/edit roles
  questionController.updateQuestion
);

// DELETE /api/questions/:id - Delete
router.delete(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin"), // Common delete roles
  questionController.deleteQuestion
);

export default router;
