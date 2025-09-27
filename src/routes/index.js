import express from "express";
import auth from "../middleware/auth.js";
import checkTypeRoutes from "./checkTypeRoutes.js";
import companyRoutes from "./companyRoutes.js";
import groupRoutes from "./groupRoutes.js";
import programRoutes from "./programRoutes.js";
import questionRoutes from "./questionRoutes.js";
import ruleRoutes from "./ruleRoutes.js";
import scheduleRoutes from "./scheduleRoutes.js";
import siteRoutes from "./siteRoutes.js";
import templateRoutes from "./templateRoutes.js";
import userRoutes from "./userRoutes.js";
import auditSessionRoutes from "./auditSessionRoutes.js";
const router = express.Router();

router.use("/api/users", userRoutes);
router.use("/api/groups", auth, groupRoutes);
router.use("/api/companies", auth, companyRoutes);
router.use("/api/sites", auth, siteRoutes);
router.use("/api/check-types", auth, checkTypeRoutes);
router.use("/api/rules", auth, ruleRoutes);
router.use("/api/templates", auth, templateRoutes);
router.use("/api/questions", auth, questionRoutes);
router.use("/api/programs", auth, programRoutes);
router.use("/api/schedules", auth, scheduleRoutes);
router.use("/api/audit-sessions", auth, auditSessionRoutes);



export default router;
