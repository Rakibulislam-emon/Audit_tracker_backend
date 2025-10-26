// src/routes/observationRoutes.js

import { Router } from "express";
import * as observationController from "../controllers/observationController.js";
// ✅ Middleware Imports (without curly braces)
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// --- Observation Routes ---
// Adjust roles as needed

// GET /api/observations - View All
router.get(
  "/",
  auth,
  // Managers, Auditors, Admins can view observations
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"),
  observationController.getAllObservations
);

// GET /api/observations/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"),
  observationController.getObservationById
);

// POST /api/observations - Create Observation (usually by Auditor)
router.post(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Auditor should be able to create
  observationController.createObservation
);

// PUT /api/observations/:id - Update Observation (Auditor might update response/severity, Manager might update status)
// Using PATCH might be better if different roles update different fields
router.patch(
  // Changed to PATCH for partial updates
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Allow auditor/manager to update
  observationController.updateObservation // Controller handles partial update
);

// DELETE /api/observations/:id - Delete Observation (usually restricted)
router.delete(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin"), // Only higher roles delete observations
  observationController.deleteObservation
);

export default router;
