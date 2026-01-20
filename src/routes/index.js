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
// ... existing imports
import dashboardRoutes from "./dashboardRoutes.js";
import questionAssignmentRoutes from "./questionAssignmentRoutes.js";
import exportRoutes from "./exportRoutes.js";

router.use("/users", userRoutes);

router.use("/groups", groupRoutes);
router.use("/companies", companyRoutes);
router.use("/sites", siteRoutes);
router.use("/checkTypes", checkTypeRoutes);
router.use("/rules", ruleRoutes);
router.use("/questions", questionRoutes);
router.use("/templates", templateRoutes);
router.use("/programs", programRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/auditSessions", auditSessionRoutes);
router.use("/teams", teamRoutes);
router.use("/observations", observationRoutes);
router.use("/problems", problemRoutes);
router.use("/fix-actions", fixAction);

router.use("/proofs", proofRoutes);

router.use("/reports", exportRoutes); // Export routes (must come first to avoid /:id conflict)
router.use("/reports", reportRoutes);

router.use("/approvals", approvalRoutes);

router.use("/dashboard", dashboardRoutes);
router.use("/metrics", metricRoutes);
router.use("/question-assignments", questionAssignmentRoutes);

export default router;
