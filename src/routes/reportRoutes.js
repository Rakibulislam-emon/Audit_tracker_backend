// // src/routes/reportRoutes.js

// import { Router } from "express";
// import * as reportController from "../controllers/reportController.js";
// // ✅ Middleware Imports (without curly braces)
// import auth from "../middleware/auth.js";
// import authorizeRoles from "../middleware/authorizeRoles.js";

// const router = Router();

// // --- Report Routes ---
// // Define roles (example roles, adjust based on config)
// const viewRoles = [
//   "admin",
//   "sysadmin",
//   "manager",
//   "auditor",
//   "complianceOfficer",
// ];
// const manageRoles = ["admin", "sysadmin", "manager"];
// const adminOnly = ["admin", "sysadmin"];

// // GET /api/reports - View All
// router.get(
//   "/",
//   auth,
//   authorizeRoles(...viewRoles),
//   reportController.getAllReports
// );

// // GET /api/reports/statistics/overview - View Stats
// router.get(
//   "/statistics/overview",
//   auth,
//   authorizeRoles(...viewRoles),
//   reportController.getReportStatistics
// );

// // GET /api/reports/audit-session/:auditSessionId - View by Session
// router.get(
//   "/audit-session/:auditSessionId",
//   auth,
//   authorizeRoles(...viewRoles),
//   reportController.getReportsByAuditSession
// );

// // GET /api/reports/:id - View Single
// router.get(
//   "/:id",
//   auth,
//   authorizeRoles(...viewRoles),
//   reportController.getReportById
// );

// // POST /api/reports - Create Report Manually (Restricted)
// router.post(
//   "/",
//   auth,
//   authorizeRoles(...adminOnly), // Only admins can create manually
//   reportController.createReport
// );

// // POST /api/reports/generate - Auto-generate Report (Main create action)
// router.post(
//   "/generate",
//   auth,
//   authorizeRoles(...manageRoles), // Managers/Admins can generate reports
//   reportController.generateReport
// );

// // ✅ Changed to PATCH for partial updates
// router.patch(
//   "/:id",
//   auth,
//   authorizeRoles(...manageRoles), // Managers/Admins can edit reports
//   reportController.updateReport
// );

// // PATCH /api/reports/:id/status - Update Report Status
// router.patch(
//   "/:id/status",
//   auth,
//   authorizeRoles(...manageRoles), // Managers/Admins can update status
//   reportController.updateReportStatus
// );

// // DELETE /api/reports/:id - Delete Report (Restricted)
// router.delete(
//   "/:id",
//   auth,
//   authorizeRoles(...adminOnly), // Only admins can delete
//   reportController.deleteReport
// );

// // POST /api/reports/:id/submit - Submit Report for Approval
// router.post(
//   "/:id/submit",
//   auth,
//   // authorizeRoles(...manageRoles), // Managers/Admins can submit for approval
//   reportController.submitReportForApproval
// );

// export default router;



// src/routes/reportRoutes.js

import { Router } from "express";
import { can } from "../config/permissions.js";
import * as reportController from "../controllers/reportController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";

const router = Router();

// GET /api/reports - View All
router.get(
  "/",
  auth,
  authorizeRoles(...can("REPORT", "VIEW")),
  reportController.getAllReports
);

// GET /api/reports/statistics/overview - View Stats
router.get(
  "/statistics/overview",
  auth,
  authorizeRoles(...can("REPORT", "VIEW")),
  reportController.getReportStatistics
);

// GET /api/reports/audit-session/:auditSessionId - View by Session
router.get(
  "/audit-session/:auditSessionId",
  auth,
  authorizeRoles(...can("REPORT", "VIEW")),
  reportController.getReportsByAuditSession
);

// GET /api/reports/:id - View Single
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("REPORT", "VIEW")),
  reportController.getReportById
);

// POST /api/reports - Create Report Manually
router.post(
  "/",
  auth,
  authorizeRoles(...can("REPORT", "CREATE")),
  reportController.createReport
);

// POST /api/reports/generate - Auto-generate Report
router.post(
  "/generate",
  auth,
  authorizeRoles(...can("REPORT", "CREATE")),
  reportController.generateReport
);

// PATCH /api/reports/:id - Update Report
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("REPORT", "UPDATE")),
  reportController.updateReport
);

// PATCH /api/reports/:id/status - Update Report Status
router.patch(
  "/:id/status",
  auth,
  authorizeRoles(...can("REPORT", "UPDATE")),
  reportController.updateReportStatus
);

// DELETE /api/reports/:id - Delete Report
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("REPORT", "DELETE")),
  reportController.deleteReport
);

// POST /api/reports/:id/submit - Submit Report for Approval
router.post(
  "/:id/submit",
  auth,
  authorizeRoles(...can("REPORT", "SUBMIT")),
  reportController.submitReportForApproval
);

export default router;