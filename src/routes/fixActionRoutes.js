// src/routes/fixActionRoutes.js

import { Router } from "express";
import { can } from "../config/permissions.js";
import * as fixActionController from "../controllers/fixActionController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// GET /api/fix-actions - View All
router.get(
  "/",
  auth,
  authorizeRoles(...can("FIX_ACTION", "VIEW")),
  fixActionController.getAllFixActions
);

// GET /api/fix-actions/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("FIX_ACTION", "VIEW")),
  fixActionController.getFixActionById
);

// POST /api/fix-actions - Create Fix Action
router.post(
  "/",
  auth,
  authorizeRoles(...can("FIX_ACTION", "CREATE")),
  fixActionController.createFixAction
);

// PATCH /api/fix-actions/:id - Update Fix Action
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("FIX_ACTION", "UPDATE")),
  fixActionController.updateFixAction
);

// DELETE /api/fix-actions/:id - Delete Fix Action
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("FIX_ACTION", "DELETE")),
  fixActionController.deleteFixAction
);

export default router;