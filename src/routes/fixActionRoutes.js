// src/routes/fixActionRoutes.js

import { Router } from "express";
import * as fixActionController from "../controllers/fixActionController.js";
// ✅ Middleware Imports (without curly braces)
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// --- Fix Action Routes ---
// Adjust roles based on dynamicConfig permissions for 'fixActions'

// GET /api/fix-actions - View All
router.get(
  "/",
  auth,
  // Who can view fix actions? Admins, Managers, Auditors, Compliance? Assigned Owners?
  authorizeRoles(
    "admin",
    "sysadmin",
    "audit_manager",
    "auditor",
    "compliance_officer"
  ), // Example broad view access
  fixActionController.getAllFixActions
);

// GET /api/fix-actions/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(
    "admin",
    "sysadmin",
    "audit_manager",
    "auditor",
    "compliance_officer"
  ), // Broad view access
  fixActionController.getFixActionById
);

// POST /api/fix-actions - Create Fix Action (usually by Manager/Admin)
router.post(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager"), // Who defines corrective actions?
  fixActionController.createFixAction
);

// PUT/PATCH /api/fix-actions/:id - Update Fix Action (status updates by Owner? verification by Manager?)
// Using PATCH for flexibility
router.patch(
  "/:id",
  auth,
  // Allow Admins, Managers, AND maybe the assigned Owner to update status? Needs careful thought.
  authorizeRoles(
    "admin",
    "sysadmin",
    "audit_manager" /* Add 'auditor' or other roles if owners can update */
  ),
  fixActionController.updateFixAction
);

// DELETE /api/fix-actions/:id - Delete Fix Action (Restricted)
router.delete(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin"), // Usually only high-level admins
  fixActionController.deleteFixAction
);

export default router;
