// src/routes/auditSessionRoutes.js

import { Router } from "express";
import * as auditSessionController from "../controllers/auditSessionController.js";
// ✅ Middleware Imports (without curly braces assuming default export)
import auth from '../middleware/auth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = Router();

// --- Audit Session Routes ---
// Adjust roles based on dynamicConfig permissions for 'auditSessions'

// GET /api/audit-sessions - View All
router.get(
    "/",
    auth,
    authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Auditors need to see sessions
    auditSessionController.getAllAuditSessions
);

// GET /api/audit-sessions/:id - View Single
router.get(
    "/:id",
    auth,
    authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Auditors need to see details
    auditSessionController.getAuditSessionById
);

// POST /api/audit-sessions - Create Session
router.post(
    "/",
    auth,
    authorizeRoles("admin", "sysadmin", "audit_manager"), // Managers/Admins create sessions
    auditSessionController.createAuditSession
);

// PUT /api/audit-sessions/:id - Update Session (e.g., status, dates)
router.patch(
    "/:id",
    auth,
    authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Auditors might update status/dates
    auditSessionController.updateAuditSession
);

// DELETE /api/audit-sessions/:id - Delete Session
router.delete(
    "/:id",
    auth,
    authorizeRoles("admin", "sysadmin"), // Only higher roles delete sessions
    auditSessionController.deleteAuditSession
);

export default router;