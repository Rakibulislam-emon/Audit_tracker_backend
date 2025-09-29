import express from "express";

const router = express.Router();

import auth from "../middleware/auth.js";
import auditSessionRoutes from "./auditSessionRoutes.js";
import checkTypeRoutes from "./checkTypeRoutes.js";
import companyRoutes from "./companyRoutes.js";
import fixAction from "./fixActionRoutes.js";
import groupRoutes from "./groupRoutes.js";
import observationRoutes from "./observationRoutes.js";
import problemRoutes from "./problemRoutes.js";
import programRoutes from "./programRoutes.js";
import proofRoutes from "./proofRoutes.js";
import questionRoutes from "./questionRoutes.js";
import ruleRoutes from "./ruleRoutes.js";
import scheduleRoutes from "./scheduleRoutes.js";
import siteRoutes from "./siteRoutes.js";
import teamRoutes from "./teamRoutes.js";
import templateRoutes from "./templateRoutes.js";
import userRoutes from "./userRoutes.js";
import reportRoutes from "./reportRoutes.js";

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
router.use("/api/teams", auth, teamRoutes);
router.use("/api/observations", auth, observationRoutes);
router.use("/api/problems", auth, problemRoutes);
router.use("/api/fix-actions",  fixAction);

// proof

router.use("/api/proofs", proofRoutes);

 router.use('/api/reports', reportRoutes);


export default router;
