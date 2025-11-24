// src/routes/programRoutes.js

import { Router } from "express";
import * as programController from "../controllers/programController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { can } from "../config/permissions.js";

const router = Router();

// GET /api/programs - View All
router.get(
  "/",
  auth,
  authorizeRoles(...can("PROGRAM", "VIEW")),
  programController.getAllPrograms
);

// GET /api/programs/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("PROGRAM", "VIEW")),
  programController.getProgramById
);

// POST /api/programs - Create
router.post(
  "/",
  auth,
  authorizeRoles(...can("PROGRAM", "CREATE")),
  programController.createProgram
);

// PATCH /api/programs/:id - Update
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("PROGRAM", "UPDATE")),
  programController.updateProgram
);

// DELETE /api/programs/:id - Delete
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("PROGRAM", "DELETE")),
  programController.deleteProgram
);

export default router;