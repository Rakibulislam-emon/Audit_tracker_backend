// src/routes/scheduleRoutes.js
import { Router } from "express";
import * as scheduleController from "../controllers/scheduleController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

router.get(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"),
  scheduleController.getAllSchedules
);
router.get(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"),
  scheduleController.getScheduleById
);
router.post(
  "/",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager"),
  scheduleController.createSchedule
);
router.patch(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager"),
  scheduleController.updateSchedule
);
router.delete(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin"),
  scheduleController.deleteSchedule
);
// router.post(
//   "/:id/start",
//   auth,
//   authorizeRoles("admin", "sysadmin", "audit_manager"), // Only managers can start an audit
//   scheduleController.startScheduleAudits
// );
export default router;
