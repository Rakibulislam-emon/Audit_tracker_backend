import { Router } from "express";
import * as auditSessionController from "../controllers/auditSessionController.js";

const router = Router();

router.get("/", auditSessionController.getAllAuditSessions);
router.get("/:id", auditSessionController.getAuditSessionById);
router.post("/", auditSessionController.createAuditSession);
router.put("/:id", auditSessionController.updateAuditSession);
router.delete("/:id", auditSessionController.deleteAuditSession);

export default router;
