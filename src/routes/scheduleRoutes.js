// src/routes/scheduleRoutes.js
import { Router } from "express";
import * as scheduleController from "../controllers/scheduleController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { can } from "../config/permissions.js";

const router = Router();

router.get(
  "/",
  auth,
  authorizeRoles(...can("SCHEDULE", "VIEW")),
  scheduleController.getAllSchedules
);
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("SCHEDULE", "VIEW")),
  scheduleController.getScheduleById
);
router.post(
  "/",
  auth,
  authorizeRoles(...can("SCHEDULE", "CREATE")),
  scheduleController.createSchedule
);
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("SCHEDULE", "UPDATE")),
  scheduleController.updateSchedule
);
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("SCHEDULE", "DELETE")),
  scheduleController.deleteSchedule
);
router.post(
  "/:id/start",
  auth,
  authorizeRoles(...can("SCHEDULE", "START")),
  scheduleController.startScheduleAudits
);
export default router;