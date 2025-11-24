

import { Router } from "express";
import { can } from "../config/permissions.js";
import * as auditSessionController from "../controllers/auditSessionController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// GET /api/audit-sessions - View All
router.get(
  "/",
  auth,
  authorizeRoles(...can("AUDIT_SESSION", "VIEW")),
  auditSessionController.getAllAuditSessions
);

// GET /api/audit-sessions/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("AUDIT_SESSION", "VIEW")),
  auditSessionController.getAuditSessionById
);

// POST /api/audit-sessions - Create Session
router.post(
  "/",
  auth,
  authorizeRoles(...can("AUDIT_SESSION", "CREATE")),
  auditSessionController.createAuditSession
);

// PATCH /api/audit-sessions/:id - Update Session
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("AUDIT_SESSION", "UPDATE")),
  auditSessionController.updateAuditSession
);

// DELETE /api/audit-sessions/:id - Delete Session
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("AUDIT_SESSION", "DELETE")),
  auditSessionController.deleteAuditSession
);

export default router;