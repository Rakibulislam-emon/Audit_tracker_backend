// src/controllers/reportController.js

import mongoose from "mongoose";
import AuditSession from "../models/AuditSession.js";
import Problem from "../models/Problem.js";
import Report from "../models/Report.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import { resolveApproverByBusinessRules } from "../utils/approvalResolver.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// 1. Get all reports (Filtering, Sorting, Count and Standard Response)
export const getAllReports = asyncHandler(async (req, res, next) => {
  const {
    search,
    auditSession,
    status,
    reportType,
    reportStatus,
    generatedBy,
  } = req.query;

  const query = {};
  if (auditSession) query.auditSession = auditSession;
  if (generatedBy) query.generatedBy = generatedBy;
  if (status === "active" || status === "inactive") query.status = status;
  if (
    reportType &&
    ["draft", "preliminary", "final", "executive"].includes(reportType)
  ) {
    query.reportType = reportType;
  }
  if (
    reportStatus &&
    ["generating", "completed", "published", "archived"].includes(reportStatus)
  ) {
    query.reportStatus = reportStatus;
  }
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [
      { title: searchRegex },
      { summary: searchRegex },
      { executiveSummary: searchRegex },
    ];
  }

  const reports = await Report.find(query)
    .populate("auditSession", "title")
    .populate("generatedBy", "name email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ generatedAt: -1 });

  const count = await Report.countDocuments(query);

  res.status(200).json({
    data: reports,
    count: count,
    message: "Reports fetched successfully",
    success: true,
  });
});

// 2. Get report by ID (Population and Response Update)
export const getReportById = asyncHandler(async (req, res, next) => {
  const report = await Report.findById(req.params.id)
    .populate({
      path: "auditSession",
      populate: [
        { path: "site", select: "name location" },
        { path: "template", select: "title version" },
        { path: "company", select: "name" },
      ],
    })
    .populate("generatedBy", "name email")
    .populate({
      path: "findings.problem",
      model: "Problem",
      populate: [
        { path: "question", select: "questionText section" },
        { path: "fixActions", select: "actionText actionStatus" },
      ],
    })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  res.status(200).json({
    data: report,
    message: "Report retrieved successfully",
    success: true,
  });
});

// 3. Create new report (manual creation - Response and Population Update)
export const createReport = asyncHandler(async (req, res, next) => {
  const {
    auditSession,
    title,
    summary,
    executiveSummary,
    findings,
    reportType,
    reportStatus,
    metrics,
  } = req.body;

  if (!auditSession || !title || !summary || !executiveSummary) {
    throw new AppError(
      "Audit session, title, summary, and executive summary are required",
      400
    );
  }

  const newReport = new Report({
    auditSession,
    title,
    summary,
    executiveSummary,
    findings: findings || [],
    metrics: metrics || {},
    reportType: reportType || "draft",
    reportStatus: reportStatus || "generating",
    generatedBy: req.user?.id,
    generatedAt: new Date(),
    ...createdBy(req),
  });

  let savedReport = await newReport.save();
  savedReport = await Report.findById(savedReport._id)
    .populate("auditSession", "title")
    .populate("generatedBy", "name email")
    .populate("createdBy", "name email");

  res.status(201).json({
    data: savedReport,
    message: "Report created successfully",
    success: true,
  });
});

// 4. Generate report automatically (FIXED: Using lowercase for enums)
export const generateReport = asyncHandler(async (req, res, next) => {
  const { auditSessionId } = req.body;
  if (!auditSessionId) {
    throw new AppError("Audit session ID is required", 400);
  }

  const existingReport = await Report.findOne({
    auditSession: auditSessionId,
  });
  if (existingReport) {
    return res.status(400).json({
      message: "A report for this audit session already exists.",
      success: false,
      data: existingReport,
    });
  }

  const auditSession = await AuditSession.findById(auditSessionId)
    .populate("site", "name")
    .populate("template", "title")
    .populate("checkType", "name");

  if (!auditSession) {
    throw new AppError("Audit session not found", 404);
  }

  // Get problems
  const problems = await Problem.find({ auditSession: auditSessionId });

  // Calculate metrics
  const metrics = {
    totalProblems: problems.length,
    criticalProblems: problems.filter(
      (p) => p.riskRating?.toLowerCase() === "critical"
    ).length,
    highRiskProblems: problems.filter(
      (p) => p.riskRating?.toLowerCase() === "high"
    ).length,
    mediumRiskProblems: problems.filter(
      (p) => p.riskRating?.toLowerCase() === "medium"
    ).length,
    lowRiskProblems: problems.filter(
      (p) => p.riskRating?.toLowerCase() === "low"
    ).length,
    complianceScore: 0,
    overallRiskRating: "low",
  };

  if (metrics.criticalProblems > 0) metrics.overallRiskRating = "critical";
  else if (metrics.highRiskProblems > 0) metrics.overallRiskRating = "high";
  else if (metrics.mediumRiskProblems > 0) metrics.overallRiskRating = "medium";

  // Create findings array (snapshot)
  const findings = problems.map((problem) => ({
    problem: problem._id,
    description: problem.description,
    riskLevel: problem.riskRating.toLowerCase(),
    recommendation: `Address the issue: ${problem.title}`,
  }));

  const reportTitle = `${auditSession.site?.name || "Site"} - ${
    auditSession.template?.title || "Audit"
  } Report - ${new Date().toLocaleDateString("en-GB")}`;

  const executiveSummary = `This report summarizes the audit conducted on ${
    auditSession.site?.name || "the site"
  }. A total of ${metrics.totalProblems} findings were identified: ${
    metrics.criticalProblems
  } Critical, ${metrics.highRiskProblems} High, ${
    metrics.mediumRiskProblems
  } Medium, and ${
    metrics.lowRiskProblems
  } Low risk. The overall risk rating for this audit is ${
    metrics.overallRiskRating.charAt(0).toUpperCase() +
    metrics.overallRiskRating.slice(1)
  }.`;

  const newReport = new Report({
    auditSession: auditSessionId,
    title: reportTitle,
    summary: `Comprehensive audit report for ${
      auditSession.site?.name || "site"
    }.`,
    executiveSummary,
    findings,
    metrics,
    reportType: "final",
    reportStatus: "completed",
    generatedBy: req.user?.id,
    generatedAt: new Date(),
    ...createdBy(req),
    status: "active",
  });

  let savedReport = await newReport.save();

  // Update audit session workflowStatus to completed
  await AuditSession.findByIdAndUpdate(auditSessionId, {
    workflowStatus: "completed",
  });

  // Populate for response
  savedReport = await Report.findById(savedReport._id)
    .populate("auditSession", "title")
    .populate("generatedBy", "name email")
    .populate("createdBy", "name email");

  res.status(201).json({
    data: savedReport,
    message: "Report generated successfully from audit session",
    success: true,
  });
});

// 5. Update report (PATCH) - (FIXED: Using lowercase for enums)
export const updateReport = asyncHandler(async (req, res, next) => {
  const {
    title,
    summary,
    executiveSummary,
    findings,
    reportType,
    reportStatus,
    status,
    metrics: metricsBody,
  } = req.body;
  const reportId = req.params.id;

  const updateData = { ...updatedBy(req) };
  if (title) updateData.title = title;
  if (summary) updateData.summary = summary;
  if (executiveSummary) updateData.executiveSummary = executiveSummary;
  if (findings) updateData.findings = findings;
  if (reportType) updateData.reportType = reportType;
  if (reportStatus) updateData.reportStatus = reportStatus;
  if (status) updateData.status = status;

  // Recalculate metrics if findings are provided
  if (findings && Array.isArray(findings)) {
    const newMetrics = {
      totalProblems: findings.length,
      criticalProblems: findings.filter(
        (f) => f.riskLevel?.toLowerCase() === "critical"
      ).length,
      highRiskProblems: findings.filter(
        (f) => f.riskLevel?.toLowerCase() === "high"
      ).length,
      mediumRiskProblems: findings.filter(
        (f) => f.riskLevel?.toLowerCase() === "medium"
      ).length,
      lowRiskProblems: findings.filter(
        (f) => f.riskLevel?.toLowerCase() === "low"
      ).length,
      complianceScore: 0,
      overallRiskRating: "low",
    };

    if (newMetrics.criticalProblems > 0)
      newMetrics.overallRiskRating = "critical";
    else if (newMetrics.highRiskProblems > 0)
      newMetrics.overallRiskRating = "high";
    else if (newMetrics.mediumRiskProblems > 0)
      newMetrics.overallRiskRating = "medium";
    updateData.metrics = newMetrics;
  } else if (metricsBody) {
    // Ensure manual override also uses lowercase
    if (metricsBody.overallRiskRating)
      metricsBody.overallRiskRating =
        metricsBody.overallRiskRating.toLowerCase();
    updateData.metrics = metricsBody;
  }

  let updatedReport = await Report.findByIdAndUpdate(reportId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedReport) {
    throw new AppError("Report not found", 404);
  }

  updatedReport = await Report.findById(updatedReport._id)
    .populate("auditSession", "title")
    .populate("generatedBy", "name email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedReport,
    message: "Report updated successfully",
    success: true,
  });
});

// 6. Delete report - Response Update
export const deleteReport = asyncHandler(async (req, res, next) => {
  const deletedReport = await Report.findByIdAndDelete(req.params.id);
  if (!deletedReport) {
    throw new AppError("Report not found", 404);
  }
  res.status(200).json({
    message: "Report deleted successfully",
    success: true,
    data: deletedReport,
  });
});

// 7. Get reports by audit session - Population and Response Update
export const getReportsByAuditSession = asyncHandler(async (req, res, next) => {
  const { auditSessionId } = req.params;
  const reports = await Report.find({ auditSession: auditSessionId })
    .populate("generatedBy", "name email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .populate("findings.problem", "title riskRating")
    .sort({ createdAt: -1 });
  const count = reports.length;
  res.status(200).json({
    data: reports,
    count: count,
    message: "Reports retrieved successfully for audit session",
    success: true,
  });
});

// 8. Update report status - Population and Response Update
export const updateReportStatus = asyncHandler(async (req, res, next) => {
  const { reportStatus } = req.body;
  const reportId = req.params.id;
  if (
    !reportStatus ||
    !["generating", "completed", "published", "archived"].includes(reportStatus)
  ) {
    throw new AppError("Invalid report status provided", 400);
  }
  let updatedReport = await Report.findByIdAndUpdate(
    reportId,
    { reportStatus, ...updatedBy(req) },
    { new: true, runValidators: true }
  );
  if (!updatedReport) {
    throw new AppError("Report not found", 404);
  }
  updatedReport = await Report.findById(updatedReport._id)
    .populate("auditSession", "title")
    .populate("generatedBy", "name email")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");
  res.status(200).json({
    data: updatedReport,
    message: "Report status updated successfully",
    success: true,
  });
});

// 9. Get report statistics - Response Update
export const getReportStatistics = asyncHandler(async (req, res, next) => {
  const totalReports = await Report.countDocuments();
  const publishedReports = await Report.countDocuments({
    reportStatus: "published",
  });
  const draftReports = await Report.countDocuments({ reportType: "draft" });
  const reportsByType = await Report.aggregate([
    { $group: { _id: "$reportType", count: { $sum: 1 } } },
  ]);
  const reportsByStatus = await Report.aggregate([
    { $group: { _id: "$reportStatus", count: { $sum: 1 } } },
  ]);
  const reportsByRisk = await Report.aggregate([
    { $group: { _id: "$metrics.overallRiskRating", count: { $sum: 1 } } },
  ]);
  res.status(200).json({
    data: {
      totalReports,
      publishedReports,
      draftReports,
      reportsByType,
      reportsByStatus,
      reportsByRisk,
    },
    message: "Report statistics retrieved successfully",
    success: true,
  });
});

/**
 * 10. Submit Report for Approval
 * Follows your exact controller pattern with proper validation and responses
 */
export const submitReportForApproval = asyncHandler(async (req, res, next) => {
  const reportId = req.params.id;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  const report = await Report.findById(reportId).populate({
    path: "auditSession",
    populate: {
      path: "site",
      populate: {
        path: "company",
      },
    },
  });

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  if (report.reportStatus !== "completed") {
    throw new AppError(
      "Only completed reports can be submitted for approval",
      400
    );
  }

  const existingApproval = await mongoose.models.Approval.findOne({
    entityType: "Report",
    entityId: reportId,
    approvalStatus: { $in: ["pending", "in-review"] },
  });

  if (existingApproval) {
    return res.status(400).json({
      message: "This report already has a pending approval request",
      success: false,
      data: existingApproval,
    });
  }

  // Use the updated resolver
  const approverId = await resolveApproverByBusinessRules(report, userId, req);

  // Prepare approval data
  const approvalData = {
    entityType: "Report",
    entityId: reportId,
    title: `Approve Report: ${report.title}`,
    description: `Please review and approve the audit report: "${
      report.title
    }". Generated from audit session at ${
      report.auditSession?.site?.name || "unknown site"
    }.`,
    approver: approverId,
    priority: "high",
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    requirements: [
      {
        description: "Verify report accuracy and completeness",
        completed: false,
      },
      {
        description: "Confirm risk assessments are appropriate",
        completed: false,
      },
      {
        description: "Validate findings and recommendations",
        completed: false,
      },
    ],
  };

  const Approval = mongoose.models.Approval;
  const newApproval = new Approval({
    ...approvalData,
    requestedBy: userId,
    timeline: {
      requestedAt: new Date(),
      deadline: approvalData.deadline,
    },
    ...createdBy(req),
  });

  newApproval.reviewHistory.push({
    reviewedBy: userId,
    action: "submitted",
    comments: "Report submitted for approval",
    reviewedAt: new Date(),
  });

  const savedApproval = await newApproval.save();

  report.reportStatus = "pending_approval";
  await report.save();

  const populatedApproval = await Approval.findById(savedApproval._id)
    .populate("approver", "name email")
    .populate("requestedBy", "name email")
    .populate("createdBy", "name email");

  res.status(200).json({
    data: {
      report: {
        _id: report._id,
        title: report.title,
        reportStatus: report.reportStatus,
      },
      approval: populatedApproval,
    },
    message: "Report submitted for approval successfully",
    success: true,
  });
});
