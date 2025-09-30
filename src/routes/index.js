import express from "express";

const router = express.Router();

import auth from "../middleware/auth.js";
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
import questionRuleLinkRoutes from "./questionRuleLinkRoutes.js";
import reportRoutes from "./reportRoutes.js";
// import ruleRoutes from "./ruleRoutes.js";
import scheduleRoutes from "./scheduleRoutes.js";
import siteRoutes from "./siteRoutes.js";
import teamRoutes from "./teamRoutes.js";
import templateRoutes from "./templateRoutes.js";
import userRoutes from "./userRoutes.js";

router.use("/api/users", userRoutes);
router.use("/api/groups", auth, groupRoutes);
router.use("/api/companies", auth, companyRoutes);
router.use("/api/sites", auth, siteRoutes);
router.use("/api/check-types", auth, checkTypeRoutes);
// router.use("/api/rules", auth, ruleRoutes);
router.use("/api/templates", auth, templateRoutes);
router.use("/api/questions", auth, questionRoutes);
router.use("/api/programs", auth, programRoutes);
router.use("/api/schedules", auth, scheduleRoutes);
router.use("/api/audit-sessions", auth, auditSessionRoutes);
router.use("/api/teams", auth, teamRoutes);
router.use("/api/observations", auth, observationRoutes);
router.use("/api/problems", auth, problemRoutes);
router.use("/api/fix-actions", fixAction);

// proof

router.use("/api/proofs", auth, proofRoutes);

router.use("/api/reports", auth, reportRoutes);

router.use("/api/approvals", auth, approvalRoutes);

router.use("/api/metrics", auth, metricRoutes);

router.use("/api/question-rule-links", auth, questionRuleLinkRoutes);
export default router;
