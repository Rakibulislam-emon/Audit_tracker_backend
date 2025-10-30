// src/routes/reportRoutes.js

import { Router } from "express";
import * as reportController from "../controllers/reportController.js";
// ✅ Middleware Imports (without curly braces)
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// --- Report Routes ---
// Define roles (example roles, adjust based on config)
const viewRoles = [
  "admin",
  "sysadmin",
  "audit_manager",
  "auditor",
  "compliance_officer",
];
const manageRoles = ["admin", "sysadmin", "audit_manager"];
const adminOnly = ["admin", "sysadmin"];

// GET /api/reports - View All
router.get(
  "/",
  auth,
  authorizeRoles(...viewRoles),
  reportController.getAllReports
);

// GET /api/reports/statistics/overview - View Stats
router.get(
  "/statistics/overview",
  auth,
  authorizeRoles(...viewRoles),
  reportController.getReportStatistics
);

// GET /api/reports/audit-session/:auditSessionId - View by Session
router.get(
  "/audit-session/:auditSessionId",
  auth,
  authorizeRoles(...viewRoles),
  reportController.getReportsByAuditSession
);

// GET /api/reports/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...viewRoles),
  reportController.getReportById
);

// POST /api/reports - Create Report Manually (Restricted)
router.post(
  "/",
  auth,
  authorizeRoles(...adminOnly), // Only admins can create manually
  reportController.createReport
);

// POST /api/reports/generate - Auto-generate Report (Main create action)
router.post(
  "/generate",
  auth,
  authorizeRoles(...manageRoles), // Managers/Admins can generate reports
  reportController.generateReport
);

// ✅ Changed to PATCH for partial updates
router.patch(
  "/:id",
  auth,
  authorizeRoles(...manageRoles), // Managers/Admins can edit reports
  reportController.updateReport
);

// PATCH /api/reports/:id/status - Update Report Status
router.patch(
  "/:id/status",
  auth,
  authorizeRoles(...manageRoles), // Managers/Admins can update status
  reportController.updateReportStatus
);

// DELETE /api/reports/:id - Delete Report (Restricted)
router.delete(
  "/:id",
  auth,
  authorizeRoles(...adminOnly), // Only admins can delete
  reportController.deleteReport
);

export default router;
