// src/routes/dashboardRoutes.js
import express from "express";
import {
  getDashboardStats,
  getRecentActivity,
  getAuditStatusDistribution,
  getAuditProgress,
  getProblemsBySeverity,
  getRiskMatrix,
  getSitePerformance,
  getUpcomingSchedules,
  getTeamPerformance,
  getApprovalFunnel,
  getFixActionsStatus,
} from "../controllers/dashboardController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// All dashboard routes require authentication
router.use(auth);

// @route   GET /api/dashboard/stats
// @desc    Get dashboard KPI statistics
// @access  Private
router.get("/stats", getDashboardStats);

// @route   GET /api/dashboard/recent-activity
// @desc    Get recent activity feed
// @access  Private
router.get("/recent-activity", getRecentActivity);

// @route   GET /api/dashboard/audit-status-distribution
// @desc    Get audit session status distribution for chart
// @access  Private
router.get("/audit-status-distribution", getAuditStatusDistribution);

// @route   GET /api/dashboard/audit-progress
// @desc    Get audit progress stats
// @access  Private
router.get("/audit-progress", getAuditProgress);

// @route   GET /api/dashboard/problems-by-severity
// @desc    Get problems grouped by severity
// @access  Private
router.get("/problems-by-severity", getProblemsBySeverity);

// @route   GET /api/dashboard/risk-matrix
// @desc    Get risk matrix data
// @access  Private
router.get("/risk-matrix", getRiskMatrix);

// @route   GET /api/dashboard/site-performance
// @desc    Get site performance stats
// @access  Private
router.get("/site-performance", getSitePerformance);

// @route   GET /api/dashboard/upcoming-schedules
// @desc    Get upcoming scheduled audits
// @access  Private
router.get("/upcoming-schedules", getUpcomingSchedules);

// @route   GET /api/dashboard/team-performance
// @desc    Get team performance leaderboard
// @access  Private
router.get("/team-performance", getTeamPerformance);

// @route   GET /api/dashboard/approval-funnel
// @desc    Get approval workflow funnel
// @access  Private
router.get("/approval-funnel", getApprovalFunnel);

// @route   GET /api/dashboard/fix-actions-status
// @desc    Get fix actions status
// @access  Private
router.get("/fix-actions-status", getFixActionsStatus);

export default router;
