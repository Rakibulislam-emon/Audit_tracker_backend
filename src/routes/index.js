import express from "express";

const router = express.Router();

import approvalRoutes from "./approvalRoutes.js";
import auditSessionRoutes from "./auditSessionRoutes.js";
import checkTypeRoutes from "./checkTypeRoutes.js";
import companyRoutes from "./companyRoutes.js";
import fixAction from "./fixActionRoutes.js";
import groupRoutes from "./groupRoutes.js";
import metricRoutes from "./metricRoutes.js";
import observationRoutes from "./observationRoutes.js";
import problemRoutes from "./problemRoutes.js";
import programRoutes from "./programRoutes.js";
import proofRoutes from "./proofRoutes.js";
import questionRoutes from "./questionRoutes.js";
import reportRoutes from "./reportRoutes.js";
import ruleRoutes from "./ruleRoutes.js";
import scheduleRoutes from "./scheduleRoutes.js";
import siteRoutes from "./siteRoutes.js";
import teamRoutes from "./teamRoutes.js";
import templateRoutes from "./templateRoutes.js";
import userRoutes from "./userRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";

router.use("/api/users", userRoutes);

router.use("/api/groups", groupRoutes);
router.use("/api/companies", companyRoutes);
router.use("/api/sites", siteRoutes);
router.use("/api/checkTypes", checkTypeRoutes);
router.use("/api/rules", ruleRoutes);
router.use("/api/questions", questionRoutes);
router.use("/api/templates", templateRoutes);
router.use("/api/programs", programRoutes);
router.use("/api/schedules", scheduleRoutes);
router.use("/api/auditSessions", auditSessionRoutes);
router.use("/api/teams", teamRoutes);
router.use("/api/observations", observationRoutes);
router.use("/api/problems", problemRoutes);
router.use("/api/fix-actions", fixAction);

router.use("/api/proofs", proofRoutes);

router.use("/api/reports", reportRoutes);

router.use("/api/approvals", approvalRoutes);

router.use("/api/dashboard", dashboardRoutes);
router.use("/api/metrics", metricRoutes);

export default router;
