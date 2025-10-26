// src/routes/programRoutes.js

import { Router } from "express";
import * as programController from "../controllers/programController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// --- Program Routes ---
// Adjust roles based on your dynamicConfig permissions for 'programs'

// GET /api/programs - View All
router.get(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Example roles
  programController.getAllPrograms
);

// GET /api/programs/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Example roles
  programController.getProgramById
);

// POST /api/programs - Create
router.post(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager"), // Example roles
  programController.createProgram
);

// PUT /api/programs/:id - Update
router.patch(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager"), // Example roles
  programController.updateProgram
);

// DELETE /api/programs/:id - Delete
router.delete(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin"), // Example roles
  programController.deleteProgram
);

export default router;
