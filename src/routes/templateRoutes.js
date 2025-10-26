// src/routes/templateRoutes.js

import { Router } from "express";
import * as templateController from "../controllers/templateController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// GET /api/templates - View All (requires view permission)
router.get(
  "/",
  auth, // Check if logged in
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Check roles
  templateController.getAllTemplates
);

// GET /api/templates/:id - View Single (requires view permission)
router.get(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"),
  templateController.getTemplateById
);

// POST /api/templates - Create (requires create permission)
router.post(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager"), // Only these roles can create
  templateController.createTemplate
);

// PUT /api/templates/:id - Update (requires edit permission)
// Note: PUT replaces the entire resource, PATCH updates partially. Usually PUT is used here.
router.patch(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager"), // Only these roles can edit
  templateController.updateTemplate
);

// DELETE /api/templates/:id - Delete (requires delete permission)
router.delete(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin"), // Only these roles can delete
  templateController.deleteTemplate
);

export default router;
