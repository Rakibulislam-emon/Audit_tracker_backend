// src/routes/problemRoutes.js

import { Router } from "express";
import * as problemController from "../controllers/problemController.js";
// ✅ Middleware Imports (without curly braces)
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// --- Problem Routes ---
// Adjust roles based on dynamicConfig permissions for 'problems'

// GET /api/problems - View All
router.get(
  "/",
  auth,
  // Typically Managers, Auditors, Compliance, Admins can view problems
  authorizeRoles(
    "admin",
    "sysadmin",
    "audit_manager",
    "auditor",
    "compliance_officer"
  ),
  problemController.getAllProblems
);

// GET /api/problems/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(
    "admin",
    "sysadmin",
    "audit_manager",
    "auditor",
    "compliance_officer"
  ),
  problemController.getProblemById
);

// POST /api/problems - Create Problem (usually from Observation by Manager/Auditor?)
router.post(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Who can create problems?
  problemController.createProblem
);

// PUT /api/problems/:id - Update Problem (e.g., status, risk, link fix actions)
// Using PATCH is better for partial updates
router.patch(
  // Changed to PATCH
  "/:id",
  auth,
  // Who can update problem details? Manager? Assigned user for fix action?
  authorizeRoles("admin", "sysadmin", "audit_manager"),
  problemController.updateProblem
);

// DELETE /api/problems/:id - Delete Problem (restricted)
router.delete(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin"), // Usually only high-level admins
  problemController.deleteProblem
);

export default router;
