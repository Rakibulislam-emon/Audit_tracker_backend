// src/controllers/dashboardController.js
import AuditSession from "../models/AuditSession.js";
import Approval from "../models/Approval.js";
import Problem from "../models/Problem.js";
import Report from "../models/Report.js";
import FixAction from "../models/FixAction.js";
import Observation from "../models/Observation.js";
import Schedule from "../models/Schedule.js";

/**
 * @desc    Get dashboard statistics (KPIs)
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Build base query filter based on user role
    let baseFilter = {};

    // For non-admin users, filter by their company/site access
    // This will be enhanced based on your permission model
    if (userRole !== "admin" && userRole !== "sysadmin") {
      // Add company/site filtering here if needed
      // baseFilter.company = req.user.company;
    }

    // 1. Active Audit Sessions (in-progress)
    let sessionFilter = {
      ...baseFilter,
      workflowStatus: "in-progress",
      status: "active",
    };
    if (userRole === "auditor") {
      sessionFilter.$or = [
        { auditor: userId },
        { leadAuditor: userId },
        { createdBy: userId },
      ];
    }

    const activeAuditSessions = await AuditSession.countDocuments(
      sessionFilter
    );

    // 2. Pending Approvals (assigned to current user)
    const pendingApprovals = await Approval.countDocuments({
      approver: userId,
      approvalStatus: { $in: ["pending", "in-review"] },
      status: "active",
    });

    // 3. Open Problems
    let problemFilter = {
      ...baseFilter,
      problemStatus: { $in: ["Open", "In Progress"] },
      status: "active",
    };
    if (userRole === "auditor") {
      problemFilter.createdBy = userId;
    }

    const openProblems = await Problem.countDocuments(problemFilter);

    // 4. Compliance Score (average from recent reports)
    const recentReports = await Report.find({
      ...baseFilter,
      status: "active",
      reportStatus: { $in: ["completed", "published"] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("metrics.complianceScore");

    const complianceScore =
      recentReports.length > 0
        ? recentReports.reduce(
            (sum, report) => sum + (report.metrics?.complianceScore || 0),
            0
          ) / recentReports.length
        : 0;

    // 5. Overdue Items (fix actions + approvals)
    const now = new Date();

    let fixActionFilter = {
      ...baseFilter,
      dueDate: { $lt: now },
      actionStatus: { $nin: ["Completed", "Verified"] },
      status: "active",
    };

    if (userRole === "auditor") {
      fixActionFilter.owner = userId;
    }

    const overdueFixActions = await FixAction.countDocuments(fixActionFilter);

    const overdueApprovals = await Approval.countDocuments({
      approver: userId,
      "timeline.deadline": { $lt: now },
      approvalStatus: { $in: ["pending", "in-review"] },
      status: "active",
    });

    const overdueItems = overdueFixActions + overdueApprovals;

    res.status(200).json({
      success: true,
      data: {
        activeAuditSessions,
        pendingApprovals,
        openProblems,
        complianceScore: Math.round(complianceScore * 10) / 10, // Round to 1 decimal
        overdueItems,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};

/**
 * @desc    Get recent activity feed
 * @route   GET /api/dashboard/recent-activity
 * @access  Private
 */
export const getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const userRole = req.user.role;

    // Build base filter
    let baseFilter = {};
    if (userRole !== "admin" && userRole !== "sysadmin") {
      // Add company/site filtering if needed
    }

    // Fetch recent activities from different collections
    const activities = [];

    // Recent Audit Sessions
    let sessionQuery = { ...baseFilter, status: "active" };
    if (userRole === "auditor") {
      sessionQuery.$or = [
        { auditor: req.user._id },
        { leadAuditor: req.user._id },
        { createdBy: req.user._id },
      ];
    }

    const recentSessions = await AuditSession.find(sessionQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "name email")
      .populate("site", "name")
      .select("title workflowStatus createdAt createdBy site");

    recentSessions.forEach((session) => {
      activities.push({
        type: "audit_session_created",
        icon: "🔍",
        user: session.createdBy,
        entity: {
          type: "AuditSession",
          id: session._id,
          title:
            session.title || `Audit at ${session.site?.name || "Unknown Site"}`,
        },
        timestamp: session.createdAt,
      });
    });

    // Recent Observations
    let obsQuery = { ...baseFilter, status: "active" };
    if (userRole === "auditor") {
      obsQuery.createdBy = req.user._id;
    }

    const recentObservations = await Observation.find(obsQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "name email")
      .select("questionText severity createdAt createdBy");

    recentObservations.forEach((obs) => {
      activities.push({
        type: "observation_created",
        icon: "📝",
        user: obs.createdBy,
        entity: {
          type: "Observation",
          id: obs._id,
          title:
            obs.questionText?.substring(0, 50) + "..." || "New Observation",
        },
        timestamp: obs.createdAt,
      });
    });

    // Recent Problems
    let problemQuery = { ...baseFilter, status: "active" };
    if (userRole === "auditor") {
      problemQuery.createdBy = req.user._id;
    }

    const recentProblems = await Problem.find(problemQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "name email")
      .select("title riskRating createdAt createdBy");

    recentProblems.forEach((problem) => {
      activities.push({
        type: "problem_identified",
        icon: "⚠️",
        user: problem.createdBy,
        entity: {
          type: "Problem",
          id: problem._id,
          title: problem.title,
        },
        timestamp: problem.createdAt,
      });
    });

    // Recent Fix Actions
    let fixActionQuery = { ...baseFilter, status: "active" };
    if (userRole === "auditor") {
      fixActionQuery.$or = [
        { owner: req.user._id },
        { createdBy: req.user._id },
      ];
    }

    const recentFixActions = await FixAction.find(fixActionQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "name email")
      .select("actionTitle createdAt createdBy");

    recentFixActions.forEach((action) => {
      activities.push({
        type: "fix_action_created",
        icon: "🔧",
        user: action.createdBy,
        entity: {
          type: "FixAction",
          id: action._id,
          title: action.actionTitle,
        },
        timestamp: action.createdAt,
      });
    });

    // Recent Reports
    let reportQuery = { ...baseFilter, status: "active" };
    if (userRole === "auditor") {
      reportQuery.generatedBy = req.user._id;
    }

    const recentReports = await Report.find(reportQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("generatedBy", "name email")
      .select("title reportStatus createdAt generatedBy");

    recentReports.forEach((report) => {
      activities.push({
        type: "report_generated",
        icon: "📄",
        user: report.generatedBy,
        entity: {
          type: "Report",
          id: report._id,
          title: report.title,
        },
        timestamp: report.createdAt,
      });
    });

    // Recent Approvals (approved/rejected)
    const recentApprovals = await Approval.find({
      status: "active",
      approvalStatus: { $in: ["approved", "rejected"] },
    })
      .sort({ "decision.decisionAt": -1 })
      .limit(5)
      .populate("decision.decisionBy", "name email")
      .select("title approvalStatus decision");

    recentApprovals.forEach((approval) => {
      if (approval.decision?.decisionAt) {
        activities.push({
          type:
            approval.approvalStatus === "approved"
              ? "approval_granted"
              : "approval_rejected",
          icon: approval.approvalStatus === "approved" ? "✔️" : "❌",
          user: approval.decision.decisionBy,
          entity: {
            type: "Approval",
            id: approval._id,
            title: approval.title,
          },
          timestamp: approval.decision.decisionAt,
        });
      }
    });

    // Sort all activities by timestamp and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    res.status(200).json({
      success: true,
      data: sortedActivities,
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch recent activity",
      error: error.message,
    });
  }
};

/**
 * @desc    Get audit status distribution for chart
 * @route   GET /api/dashboard/audit-status-distribution
 * @access  Private
 */
export const getAuditStatusDistribution = async (req, res) => {
  try {
    const userRole = req.user.role;

    // Build base filter
    let baseFilter = { status: "active" };
    if (userRole !== "admin" && userRole !== "sysadmin") {
      // Add company/site filtering if needed
    }

    // Aggregate by workflowStatus
    let aggFilter = { ...baseFilter };
    if (userRole === "auditor") {
      aggFilter.$or = [
        { auditor: req.user._id },
        { leadAuditor: req.user._id },
        { createdBy: req.user._id },
      ];
    }

    const distribution = await AuditSession.aggregate([
      { $match: aggFilter },
      {
        $group: {
          _id: "$workflowStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Format response
    const result = {
      planned: 0,
      "in-progress": 0,
      completed: 0,
      cancelled: 0,
    };

    distribution.forEach((item) => {
      if (result.hasOwnProperty(item._id)) {
        result[item._id] = item.count;
      }
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching audit status distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch audit status distribution",
      error: error.message,
    });
  }
};

/**
 * @desc    Get audit progress (planned vs completed) for last 6 months
 * @route   GET /api/dashboard/audit-progress
 * @access  Private
 */
export const getAuditProgress = async (req, res) => {
  try {
    const userRole = req.user.role;
    let baseFilter = { status: "active" };

    if (userRole !== "admin" && userRole !== "sysadmin") {
      // For auditors/managers, only show audits they are involved in or created
      // This is a simplified logic - adjust based on your specific requirements
      // baseFilter.$or = [{ createdBy: req.user._id }, { assignedTo: req.user._id }];
    }

    // Calculate date range (last 6 months)
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 5);
    start.setDate(1); // Start of that month

    let progressFilter = {
      ...baseFilter,
      createdAt: { $gte: start, $lte: end },
    };
    if (userRole === "auditor") {
      progressFilter.$or = [
        { auditor: req.user._id },
        { leadAuditor: req.user._id },
        { createdBy: req.user._id },
      ];
    }

    const audits = await AuditSession.find(progressFilter).select(
      "workflowStatus createdAt plannedDate"
    );

    // Initialize months map
    const monthsMap = {};
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 0; i < 6; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthsMap[key] = {
        name: monthNames[d.getMonth()],
        planned: 0,
        completed: 0,
      };
    }

    audits.forEach((audit) => {
      const date = new Date(audit.createdAt); // Or use plannedDate for 'planned'
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

      if (monthsMap[key]) {
        monthsMap[key].planned += 1; // Assuming all created sessions were "planned"
        if (audit.workflowStatus === "completed") {
          monthsMap[key].completed += 1;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: Object.values(monthsMap),
    });
  } catch (error) {
    console.error("Error fetching audit progress:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch audit progress" });
  }
};

/**
 * @desc    Get problems by severity and status
 * @route   GET /api/dashboard/problems-by-severity
 * @access  Private
 */
export const getProblemsBySeverity = async (req, res) => {
  try {
    const userRole = req.user.role;
    let baseFilter = { status: "active" };

    if (userRole === "auditor") {
      baseFilter.createdBy = req.user._id;
    }

    const problems = await Problem.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: { severity: "$riskRating", status: "$problemStatus" },
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      Critical: { open: 0, inProgress: 0, resolved: 0 },
      High: { open: 0, inProgress: 0, resolved: 0 },
      Medium: { open: 0, inProgress: 0, resolved: 0 },
      Low: { open: 0, inProgress: 0, resolved: 0 },
    };

    problems.forEach((p) => {
      const severity = p._id.severity || "Low";
      const status = p._id.status;

      if (result[severity]) {
        if (["Open", "New"].includes(status)) result[severity].open += p.count;
        else if (["In Progress", "Pending"].includes(status))
          result[severity].inProgress += p.count;
        else if (["Resolved", "Closed", "Verified"].includes(status))
          result[severity].resolved += p.count;
      }
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching problems by severity:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch problems data" });
  }
};

/**
 * @desc    Get risk matrix data (Impact vs Likelihood)
 * @route   GET /api/dashboard/risk-matrix
 * @access  Private
 */
export const getRiskMatrix = async (req, res) => {
  try {
    const userRole = req.user.role;
    let baseFilter = { status: "active" };

    if (userRole === "auditor") {
      baseFilter.createdBy = req.user._id;
    }

    const problems = await Problem.find(baseFilter).select(
      "title riskRating impact likelihood"
    );

    // Group by Impact/Likelihood coordinates
    // Impact: Low, Medium, High, Critical
    // Likelihood: Rare, Unlikely, Possible, Likely, Almost Certain

    // Mock mapping if fields missing (temporary for MVP if schema doesn't support)
    const matrix = [];

    // We need to return a list of bubbles: { x: Impact, y: Likelihood, z: Count, problems: [] }
    // Let's simplify to a grid 3x3 or 4x4

    const grid = {};

    problems.forEach((p) => {
      // Defaulting if missing
      const impact = p.impact || "Medium";
      const likelihood = p.likelihood || "Possible";
      const key = `${impact}-${likelihood}`;

      if (!grid[key]) {
        grid[key] = { impact, likelihood, count: 0, examples: [] };
      }

      grid[key].count++;
      if (grid[key].examples.length < 3) {
        grid[key].examples.push(p.title);
      }
    });

    res.status(200).json({ success: true, data: Object.values(grid) });
  } catch (error) {
    console.error("Error fetching risk matrix:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch risk matrix" });
  }
};

/**
 * @desc    Get site performance (compliance scores)
 * @route   GET /api/dashboard/site-performance
 * @access  Private
 */
export const getSitePerformance = async (req, res) => {
  try {
    const userRole = req.user.role;
    let baseFilter = { status: "active", reportStatus: "published" };

    if (userRole === "auditor") {
      baseFilter.generatedBy = req.user._id;
    }

    // Aggregate reports to get average score per site
    const siteStats = await Report.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: "$site", // Assuming site is an ObjectId reference
          avgScore: { $avg: "$metrics.complianceScore" },
          auditCount: { $sum: 1 },
        },
      },
      { $sort: { avgScore: -1 } }, // Top performing first
      { $limit: 10 },
    ]);

    // Populate site names (since aggregate returns _id)
    const populatedStats = await AuditSession.populate(siteStats, {
      path: "_id",
      select: "name",
      model: "Site",
    });

    // Also get open problems count per site
    // This requires a separate aggregation or lookup

    const result = populatedStats.map((stat) => ({
      siteId: stat._id?._id,
      siteName: stat._id?.name || "Unknown Site",
      complianceScore: Math.round(stat.avgScore * 10) / 10,
      auditCount: stat.auditCount,
      openProblems: 0, // Placeholder, would need complex lookup or separate query
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching site performance:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch site performance" });
  }
};

/**
 * @desc    Get upcoming scheduled audits (next 30 days)
 * @route   GET /api/dashboard/upcoming-schedules
 * @access  Private
 */
export const getUpcomingSchedules = async (req, res) => {
  try {
    const userRole = req.user.role;
    let baseFilter = { status: "active" };

    if (userRole === "auditor") {
      baseFilter.assignedUser = req.user._id;
    }

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);

    const schedules = await Schedule.find({
      ...baseFilter,
      plannedDate: { $gte: start, $lte: end },
    })
      .sort({ plannedDate: 1 })
      .limit(10)
      .populate("site", "name")
      .populate("assignedUser", "name")
      .select("title plannedDate site status assignedUser");

    res.status(200).json({ success: true, data: schedules });
  } catch (error) {
    console.error("Error fetching upcoming schedules:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch upcoming schedules" });
  }
};

/**
 * @desc    Get team performance leaderboard
 * @route   GET /api/dashboard/team-performance
 * @access  Private
 */
export const getTeamPerformance = async (req, res) => {
  try {
    // Team performance is usually visible to everyone, or restricted to admins
    // For now, we allow everyone to see the leaderboard

    // Aggregate completed audits by user
    const auditCounts = await AuditSession.aggregate([
      { $match: { status: "active", workflowStatus: "completed" } },
      {
        $group: {
          _id: "$createdBy", // Assuming createdBy is the auditor
          completedAudits: { $sum: 1 },
        },
      },
    ]);

    // Aggregate observations by user
    const obsCounts = await Observation.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$createdBy",
          observationCount: { $sum: 1 },
        },
      },
    ]);

    // Merge data
    const performanceMap = {};

    auditCounts.forEach((item) => {
      const id = item._id.toString();
      if (!performanceMap[id])
        performanceMap[id] = { userId: item._id, audits: 0, observations: 0 };
      performanceMap[id].audits = item.completedAudits;
    });

    obsCounts.forEach((item) => {
      const id = item._id.toString();
      if (!performanceMap[id])
        performanceMap[id] = { userId: item._id, audits: 0, observations: 0 };
      performanceMap[id].observations = item.observationCount;
    });

    // Populate user details
    // We need to fetch user details for these IDs.
    // Since we can't easily populate a map, let's get the IDs and query User model.
    // Or use AuditSession populate trick if we had a base query.
    // Better to populate here.

    // Convert map to array
    const performanceList = Object.values(performanceMap);

    // Sort by audits then observations
    performanceList.sort(
      (a, b) => b.audits - a.audits || b.observations - a.observations
    );

    // Limit to top 10
    const topPerformers = performanceList.slice(0, 10);

    // Populate names (using AuditSession as a proxy to reach User model if we don't import User)
    // Actually we imported User in auth middleware but not here.
    // Let's use AuditSession.populate which can populate any model if we specify it.

    const populated = await AuditSession.populate(topPerformers, {
      path: "userId",
      select: "name email",
      model: "User",
    });

    const result = populated.map((p) => ({
      id: p.userId?._id,
      name: p.userId?.name || "Unknown User",
      email: p.userId?.email,
      audits: p.audits,
      observations: p.observations,
    }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching team performance:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch team performance" });
  }
};

/**
 * @desc    Get approval workflow funnel data
 * @route   GET /api/dashboard/approval-funnel
 * @access  Private
 */
export const getApprovalFunnel = async (req, res) => {
  try {
    const userRole = req.user.role;
    let baseFilter = { status: "active" };

    if (userRole === "auditor") {
      baseFilter.generatedBy = req.user._id;
    }

    // 1. Reports Generated
    const generated = await Report.countDocuments(baseFilter);

    // 2. Submitted for Approval (Pending + In Review + Approved + Rejected)
    // Basically any approval record created
    const submitted = await Approval.countDocuments({ status: "active" });

    // 3. In Review
    const inReview = await Approval.countDocuments({
      status: "active",
      approvalStatus: "in-review",
    });

    // 4. Approved
    const approved = await Approval.countDocuments({
      status: "active",
      approvalStatus: "approved",
    });

    // 5. Published (Reports with status published)
    const published = await Report.countDocuments({
      status: "active",
      reportStatus: "published",
    });

    const funnelData = [
      { stage: "Generated", count: generated, fill: "#3B82F6" },
      { stage: "Submitted", count: submitted, fill: "#8B5CF6" },
      { stage: "In Review", count: inReview, fill: "#F59E0B" },
      { stage: "Approved", count: approved, fill: "#10B981" },
      { stage: "Published", count: published, fill: "#059669" },
    ];

    res.status(200).json({ success: true, data: funnelData });
  } catch (error) {
    console.error("Error fetching approval funnel:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch approval funnel" });
  }
};

/**
 * @desc    Get fix actions status summary
 * @route   GET /api/dashboard/fix-actions-status
 * @access  Private
 */
export const getFixActionsStatus = async (req, res) => {
  try {
    const userRole = req.user.role;
    let baseFilter = { status: "active" };

    if (userRole === "auditor") {
      baseFilter.owner = req.user._id;
    }

    const total = await FixAction.countDocuments(baseFilter);
    const completed = await FixAction.countDocuments({
      status: "active",
      actionStatus: "Completed",
    });
    const inProgress = await FixAction.countDocuments({
      status: "active",
      actionStatus: "In Progress",
    });

    const now = new Date();
    const overdue = await FixAction.countDocuments({
      status: "active",
      dueDate: { $lt: now },
      actionStatus: { $nin: ["Completed", "Verified"] },
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        completed,
        inProgress,
        overdue,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching fix actions status:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch fix actions status" });
  }
};
