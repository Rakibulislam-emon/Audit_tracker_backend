// src/controllers/reportController.js

import mongoose from "mongoose";
import AuditSession from "../models/AuditSession.js";
import Problem from "../models/Problem.js";
import Report from "../models/Report.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import { resolveApproverByBusinessRules } from "../utils/approvalResolver.js";

// ১. Get all reports (ফিল্টারিং, সর্টিং, কাউন্ট এবং স্ট্যান্ডার্ড রেসপন্স সহ)
export const getAllReports = async (req, res) => {
  try {
    const {
      search,
      auditSession,
      status,
      reportType,
      reportStatus,
      generatedBy,
    } = req.query;
    console.log("[getAllReports] req.query:", req.query);
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
      ["generating", "completed", "published", "archived"].includes(
        reportStatus
      )
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
    console.log("[getAllReports] Final Mongoose Query:", JSON.stringify(query));
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
  } catch (error) {
    console.error("[getAllReports] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ২. Get report by ID (Population ও রেসপন্স আপডেট)
export const getReportById = async (req, res) => {
  try {
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
      return res
        .status(404)
        .json({ message: "Report not found", success: false });
    }
    res.status(200).json({
      data: report,
      message: "Report retrieved successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getReportById] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ৩. Create new report (manual creation - রেসপন্স ও Population আপডেট)
export const createReport = async (req, res) => {
  try {
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
      return res.status(400).json({
        message:
          "Audit session, title, summary, and executive summary are required",
        success: false,
      });
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
  } catch (error) {
    console.error("[createReport] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error creating report",
      error: error.message,
      success: false,
    });
  }
};

// ৪. Generate report automatically (FIXED: Using lowercase for enums)
export const generateReport = async (req, res) => {
  try {
    const { auditSessionId } = req.body;
    if (!auditSessionId) {
      return res
        .status(400)
        .json({ message: "Audit session ID is required", success: false });
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
      return res
        .status(404)
        .json({ message: "Audit session not found", success: false });
    }

    // Get problems (assuming Problem schema uses Capitalized enums, adjust if needed)
    const problems = await Problem.find({ auditSession: auditSessionId });

    // Calculate metrics
    const metrics = {
      totalProblems: problems.length,
      // ✅ ফিক্স: Schema (lowercase) অনুযায়ী Problem-এর riskRating চেক করা
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
      overallRiskRating: "low", // ডিফল্ট (lowercase)
    };

    // ✅ ফিক্স: Schema (lowercase) অনুযায়ী overallRiskRating সেট করা
    if (metrics.criticalProblems > 0) metrics.overallRiskRating = "critical";
    else if (metrics.highRiskProblems > 0) metrics.overallRiskRating = "high";
    else if (metrics.mediumRiskProblems > 0)
      metrics.overallRiskRating = "medium";

    // Create findings array (snapshot)
    const findings = problems.map((problem) => ({
      problem: problem._id,
      description: problem.description,
      riskLevel: problem.riskRating.toLowerCase(), // ✅ Schema (lowercase) অনুযায়ী সেভ করা
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
    }.`; // Display capitalized, save lowercase

    const newReport = new Report({
      auditSession: auditSessionId,
      title: reportTitle,
      summary: `Comprehensive audit report for ${
        auditSession.site?.name || "site"
      }.`,
      executiveSummary,
      findings,
      metrics, // metrics অবজেক্টে এখন সব lowercase ভ্যালু আছে
      reportType: "final",
      reportStatus: "completed",
      generatedBy: req.user?.id,
      generatedAt: new Date(),
      ...createdBy(req),
      status: "active",
    });

    let savedReport = await newReport.save(); // ✅ Mongoose এখন ভ্যালিডেশন পাস করবে

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
  } catch (error) {
    console.error("Generate report error:", error); // ✅ এরর লগ
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error generating report",
      error: error.message,
      success: false,
    });
  }
};

// ৫. Update report (PATCH) - (FIXED: Using lowercase for enums)
export const updateReport = async (req, res) => {
  try {
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
        // ✅ ফিক্স: Schema (lowercase) অনুযায়ী গণনা
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
      // ✅ ফিক্স: Schema (lowercase) অনুযায়ী সেট করা
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
      return res
        .status(404)
        .json({ message: "Report not found", success: false });
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
  } catch (error) {
    console.error("[updateReport] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error updating report",
      error: error.message,
      success: false,
    });
  }
};

// ৬. Delete report - রেসপন্স আপডেট
export const deleteReport = async (req, res) => {
  try {
    const deletedReport = await Report.findByIdAndDelete(req.params.id);
    if (!deletedReport) {
      return res
        .status(404)
        .json({ message: "Report not found", success: false });
    }
    res.status(200).json({
      message: "Report deleted successfully",
      success: true,
      data: deletedReport,
    });
  } catch (error) {
    console.error("[deleteReport] Error:", error);
    res.status(500).json({
      message: "Error deleting report",
      error: error.message,
      success: false,
    });
  }
};

// ৭. Get reports by audit session - Population ও রেসপন্স আপডেট
export const getReportsByAuditSession = async (req, res) => {
  try {
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
  } catch (error) {
    console.error("[getReportsByAuditSession] Error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

// ৮. Update report status - Population ও রেসপন্স আপডেট
export const updateReportStatus = async (req, res) => {
  try {
    const { reportStatus } = req.body;
    const reportId = req.params.id;
    if (
      !reportStatus ||
      !["generating", "completed", "published", "archived"].includes(
        reportStatus
      )
    ) {
      return res
        .status(400)
        .json({ message: "Invalid report status provided", success: false });
    }
    let updatedReport = await Report.findByIdAndUpdate(
      reportId,
      { reportStatus, ...updatedBy(req) },
      { new: true, runValidators: true }
    );
    if (!updatedReport) {
      return res
        .status(404)
        .json({ message: "Report not found", success: false });
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
  } catch (error) {
    console.error("[updateReportStatus] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error updating report status",
      error: error.message,
      success: false,
    });
  }
};

// ৯. Get report statistics - রেসপন্স আপডেট
export const getReportStatistics = async (req, res) => {
  try {
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
    // ✅ ফিক্স: Schema (lowercase) অনুযায়ী `$metrics.overallRiskRating`-কে $group করা
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
  } catch (error) {
    console.error("[getReportStatistics] Error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

/**
 * 10. Submit Report for Approval
 * Follows your exact controller pattern with proper validation and responses
 */
export const submitReportForApproval = async (req, res) => {
  try {
    const reportId = req.params.id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    console.log(
      `📤 Submitting report for approval: ${reportId} by user: ${userId} (${userRole})`
    );

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
      return res.status(404).json({
        message: "Report not found",
        success: false,
      });
    }

    if (report.reportStatus !== "completed") {
      return res.status(400).json({
        message: "Only completed reports can be submitted for approval",
        success: false,
      });
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

    // ✅ ULTIMATE FIX: Use the updated resolver
    const approverId = await resolveApproverByBusinessRules(
      report,
      userId,
      req
    );

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

    console.log(`✅ Report submitted for approval successfully: ${reportId}`);

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
  } catch (error) {
    console.error("[submitReportForApproval] Error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
        error: error.errors,
        success: false,
      });
    }

    res.status(500).json({
      message: "Failed to submit report for approval",
      error: error.message,
      success: false,
    });
  }
};

// Add to reportController.js - Simple approval trigger
// export const submitReportForApproval = async (req, res) => {
//   try {
//     const reportId = req.params.id;
//     const userId = req.user?.id;

//     // 1. Find the report
//     const report = await Report.findById(reportId);
//     if (!report) {
//       return res.status(404).json({
//         message: "Report not found",
//         success: false
//       });
//     }

//     // 2. Update report status
//     report.reportStatus = "pending_approval";
//     await report.save();

//     // 3. Find any manager as approver (simple approach)
//     const approver = await User.findOne({
//       role: { $in: ["admin", "manager"] },
//       status: "active"
//     });

//     if (!approver) {
//       return res.status(400).json({
//         message: "No approver available",
//         success: false
//       });
//     }

//     // 4. Create approval
//     const approval = new Approval({
//       entityType: "Report",
//       entityId: reportId,
//       title: `Approval for Report: ${report.title}`,
//       description: `Please review and approve the audit report`,
//       approver: approver._id,
//       requestedBy: userId,
//       priority: "medium",
//       timeline: {
//         requestedAt: new Date(),
//         deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
//       }
//     });

//     await approval.save();

//     res.status(200).json({
//       data: { report, approval },
//       message: "Report submitted for approval successfully",
//       success: true
//     });

//   } catch (error) {
//     console.error("[submitReportForApproval] Error:", error);
//     res.status(400).json({
//       message: "Error submitting report for approval",
//       error: error.message,
//       success: false
//     });
//   }
// };
