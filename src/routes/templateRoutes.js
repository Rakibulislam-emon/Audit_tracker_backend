// src/routes/templateRoutes.js

import { Router } from "express";
import { can } from "../config/permissions.js";
import * as templateController from "../controllers/templateController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// GET /api/templates - View All
router.get(
  "/",
  auth,
  authorizeRoles(...can("TEMPLATE", "VIEW")),
  templateController.getAllTemplates
);

// GET /api/templates/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("TEMPLATE", "VIEW")),
  templateController.getTemplateById
);

// POST /api/templates - Create
router.post(
  "/",
  auth,
  authorizeRoles(...can("TEMPLATE", "CREATE")),
  templateController.createTemplate
);

// PATCH /api/templates/:id - Update
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("TEMPLATE", "UPDATE")),
  templateController.updateTemplate
);

// DELETE /api/templates/:id - Delete
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("TEMPLATE", "DELETE")),
  templateController.deleteTemplate
);

export default router;