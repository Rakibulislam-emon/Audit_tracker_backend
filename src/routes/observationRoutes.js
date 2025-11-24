// src/routes/observationRoutes.js

import { Router } from "express";
import * as observationController from "../controllers/observationController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { can } from "../config/permissions.js";

const router = Router();

// GET /api/observations - View All
router.get(
  "/",
  auth,
  authorizeRoles(...can("OBSERVATION", "VIEW")),
  observationController.getAllObservations
);

// GET /api/observations/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("OBSERVATION", "VIEW")),
  observationController.getObservationById
);

// POST /api/observations - Create Observation
router.post(
  "/",
  auth,
  authorizeRoles(...can("OBSERVATION", "CREATE")),
  observationController.createObservation
);

// PATCH /api/observations/:id - Update Observation
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("OBSERVATION", "UPDATE")),
  observationController.updateObservation
);

// DELETE /api/observations/:id - Delete Observation
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("OBSERVATION", "DELETE")),
  observationController.deleteObservation
);

export default router;