import { Router } from "express";
import { can } from "../config/permissions.js";
import * as auditSessionController from "../controllers/auditSessionController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import { protectClosedAudit } from "../middleware/protectClosedAudit.js"; // ✅ Import protection middleware

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
  protectClosedAudit, // ✅ Protect locked audits
  auditSessionController.updateAuditSession
);

// DELETE /api/audit-sessions/:id - Delete Session
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("AUDIT_SESSION", "DELETE")),
  protectClosedAudit, // ✅ Protect locked audits
  auditSessionController.deleteAuditSession
);

// POST /api/audit-sessions/:id/close - Close Session (Approver only)
router.post(
  "/:id/close",
  auth,
  authorizeRoles("approver", "admin", "sysadmin", "superAdmin"),
  auditSessionController.closeAuditSession
);

export default router;
