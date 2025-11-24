// src/routes/problemRoutes.js

import { Router } from "express";
import { can } from "../config/permissions.js";
import * as problemController from "../controllers/problemController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// GET /api/problems - View All
router.get(
  "/",
  auth,
  authorizeRoles(...can("PROBLEM", "VIEW")),
  problemController.getAllProblems
);

// GET /api/problems/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("PROBLEM", "VIEW")),
  problemController.getProblemById
);

// POST /api/problems - Create Problem
router.post(
  "/",
  auth,
  authorizeRoles(...can("PROBLEM", "CREATE")),
  problemController.createProblem
);

// PATCH /api/problems/:id - Update Problem
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("PROBLEM", "UPDATE")),
  problemController.updateProblem
);

// DELETE /api/problems/:id - Delete Problem
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("PROBLEM", "DELETE")),
  problemController.deleteProblem
);

export default router;