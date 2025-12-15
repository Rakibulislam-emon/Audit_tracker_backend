// src/routes/scheduleRoutes.js
import { Router } from "express";
import * as scheduleController from "../controllers/scheduleController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import authorizeLeadAuditor from "../middleware/authorizeLeadAuditor.js";
import { can } from "../config/permissions.js";

const router = Router();

// GET all schedules
router.get(
  "/",
  auth,
  authorizeRoles(...can("SCHEDULE", "VIEW")),
  scheduleController.getAllSchedules
);

// POST - Start audit (MUST come before /:id routes!)
router.post(
  "/:id/start",
  auth,
  authorizeLeadAuditor,
  scheduleController.startScheduleAudits
);

// GET single schedule by ID
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("SCHEDULE", "VIEW")),
  scheduleController.getScheduleById
);

// POST - Create new schedule
router.post(
  "/",
  auth,
  authorizeRoles(...can("SCHEDULE", "CREATE")),
  scheduleController.createSchedule
);

// PATCH - Update schedule
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("SCHEDULE", "UPDATE")),
  scheduleController.updateSchedule
);

// DELETE - Delete schedule
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("SCHEDULE", "DELETE")),
  scheduleController.deleteSchedule
);

export default router;
