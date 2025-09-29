import Report from "../models/Report.js";
import AuditSession from "../models/AuditSession.js";
import Problem from "../models/Problem.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// ১. Get all reports
export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("auditSession", "title startDate endDate")
      .populate("generatedBy", "name email")
      .populate("findings.problem", "title impact likelihood riskRating")
      .populate("createdBy", "name email");
    
    res.status(200).json({
      reports,
      message: "Reports retrieved successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ২. Get report by ID
export const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("auditSession", "title startDate endDate site template")
      .populate("generatedBy", "name email")
      .populate({
        path: "findings.problem",
        populate: [
          { path: "auditSession", select: "title" },
          { path: "question", select: "questionText section" }
        ]
      })
      .populate("createdBy", "name email");
    
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    res.status(200).json({
      report,
      message: "Report retrieved successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ৩. Create new report (manual creation)
export const createReport = async (req, res) => {
  try {
    const {
      auditSession,
      title,
      summary,
      executiveSummary,
      findings,
      reportType,
      reportStatus
    } = req.body;

    if (!auditSession || !title || !summary || !executiveSummary) {
      return res.status(400).json({
        message: "Audit session, title, summary, and executive summary are required"
      });
    }

    // Calculate metrics if findings are provided
    let metrics = {
      totalProblems: 0,
      criticalProblems: 0,
      highRiskProblems: 0,
      mediumRiskProblems: 0,
      lowRiskProblems: 0,
      complianceScore: 0,
      overallRiskRating: 'medium'
    };

    if (findings && findings.length > 0) {
      metrics.totalProblems = findings.length;
      
      findings.forEach(finding => {
        if (finding.riskLevel === 'critical') metrics.criticalProblems++;
        else if (finding.riskLevel === 'high') metrics.highRiskProblems++;
        else if (finding.riskLevel === 'medium') metrics.mediumRiskProblems++;
        else if (finding.riskLevel === 'low') metrics.lowRiskProblems++;
      });

      // Determine overall risk rating
      if (metrics.criticalProblems > 0) metrics.overallRiskRating = 'critical';
      else if (metrics.highRiskProblems > 0) metrics.overallRiskRating = 'high';
      else if (metrics.mediumRiskProblems > 0) metrics.overallRiskRating = 'medium';
      else metrics.overallRiskRating = 'low';
    }

    const newReport = new Report({
      auditSession,
      title,
      summary,
      executiveSummary,
      findings: findings || [],
      metrics,
      reportType: reportType || 'draft',
      reportStatus: reportStatus || 'completed',
      generatedBy: req.user?.id || req.body.generatedBy,
      generatedAt: new Date(),
      ...createdBy(req)
    });

    const savedReport = await newReport.save();
    
    res.status(201).json({
      savedReport,
      message: "Report created successfully"
    });
  } catch (error) {
    res.status(400).json({ message: "Error creating report" });
  }
};

// ৪. Generate report automatically from audit session
export const generateReport = async (req, res) => {
  try {
    const { auditSessionId } = req.body;

    if (!auditSessionId) {
      return res.status(400).json({ message: "Audit session ID is required" });
    }

    // Get audit session details
    const auditSession = await AuditSession.findById(auditSessionId)
      .populate("site", "name")
      .populate("template", "title")
      .populate("checkType", "name");

    if (!auditSession) {
      return res.status(404).json({ message: "Audit session not found" });
    }

    // Get all problems for this audit session
    const problems = await Problem.find({ auditSession: auditSessionId })
      .populate("question", "questionText section");

    // Calculate metrics
    const metrics = {
      totalProblems: problems.length,
      criticalProblems: problems.filter(p => p.riskRating === 'critical').length,
      highRiskProblems: problems.filter(p => p.riskRating === 'high').length,
      mediumRiskProblems: problems.filter(p => p.riskRating === 'medium').length,
      lowRiskProblems: problems.filter(p => p.riskRating === 'low').length,
      complianceScore: 0, // This would be calculated based on total questions vs problems
      overallRiskRating: 'medium'
    };

    // Determine overall risk rating
    if (metrics.criticalProblems > 0) metrics.overallRiskRating = 'critical';
    else if (metrics.highRiskProblems > 0) metrics.overallRiskRating = 'high';
    else if (metrics.mediumRiskProblems > 0) metrics.overallRiskRating = 'medium';
    else metrics.overallRiskRating = 'low';

    // Create findings array from problems
    const findings = problems.map(problem => ({
      problem: problem._id,
      description: problem.description || problem.title,
      riskLevel: problem.riskRating,
      recommendation: `Address the issue: ${problem.title}`
    }));

    // Generate report title
    const reportTitle = `${auditSession.site?.name || 'Site'} - ${auditSession.template?.title || 'Audit'} Report - ${new Date().toLocaleDateString()}`;

    // Create executive summary
    const executiveSummary = `This report summarizes the audit conducted on ${auditSession.site?.name || 'the site'}. 
      ${metrics.totalProblems} issues were identified, including ${metrics.criticalProblems} critical, 
      ${metrics.highRiskProblems} high, ${metrics.mediumRiskProblems} medium, and ${metrics.lowRiskProblems} low risk issues.`;

    const newReport = new Report({
      auditSession: auditSessionId,
      title: reportTitle,
      summary: `Comprehensive audit report for ${auditSession.site?.name || 'site'} covering ${auditSession.checkType?.name || 'various'} aspects.`,
      executiveSummary,
      findings,
      metrics,
      reportType: 'final',
      status: 'completed',
      generatedBy: req.user?.id,
      generatedAt: new Date(),
      ...createdBy(req)
    });

    const savedReport = await newReport.save();

    // Update audit session status to completed
    await AuditSession.findByIdAndUpdate(auditSessionId, { status: 'completed' });

    res.status(201).json({
      savedReport,
      message: "Report generated successfully from audit session"
    });
  } catch (error) {
    console.error("Generate report error:", error);
    res.status(400).json({ message: "Error generating report" });
  }
};

// ৫. Update report
export const updateReport = async (req, res) => {
  try {
    const {
      title,
      summary,
      executiveSummary,
      findings,
      reportType,
      status
    } = req.body;

    const reportId = req.params.id;

    // Recalculate metrics if findings are updated
    let updateData = {
      title,
      summary,
      executiveSummary,
      findings,
      reportType,
      status,
      ...updatedBy(req)
    };

    if (findings && findings.length > 0) {
      const metrics = {
        totalProblems: findings.length,
        criticalProblems: findings.filter(f => f.riskLevel === 'critical').length,
        highRiskProblems: findings.filter(f => f.riskLevel === 'high').length,
        mediumRiskProblems: findings.filter(f => f.riskLevel === 'medium').length,
        lowRiskProblems: findings.filter(f => f.riskLevel === 'low').length,
        complianceScore: 0,
        overallRiskRating: 'medium'
      };

      if (metrics.criticalProblems > 0) metrics.overallRiskRating = 'critical';
      else if (metrics.highRiskProblems > 0) metrics.overallRiskRating = 'high';
      else if (metrics.mediumRiskProblems > 0) metrics.overallRiskRating = 'medium';
      else metrics.overallRiskRating = 'low';

      updateData.metrics = metrics;
    }

    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedReport) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.status(200).json({
      updatedReport,
      message: "Report updated successfully"
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating report" });
  }
};

// ৬. Delete report
export const deleteReport = async (req, res) => {
  try {
    const deletedReport = await Report.findByIdAndDelete(req.params.id);
    
    if (!deletedReport) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.status(200).json({ message: "Report deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting report" });
  }
};

// ৭. Get reports by audit session
export const getReportsByAuditSession = async (req, res) => {
  try {
    const { auditSessionId } = req.params;

    const reports = await Report.find({ auditSession: auditSessionId })
      .populate("generatedBy", "name email")
      .populate("findings.problem", "title riskRating")
      .sort({ createdAt: -1 });

    res.status(200).json({
      reports,
      message: "Reports retrieved successfully for audit session"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ৮. Update report status
export const updateReportStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const reportId = req.params.id;

    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      { status, ...updatedBy(req) },
      { new: true }
    );

    if (!updatedReport) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.status(200).json({
      updatedReport,
      message: "Report status updated successfully"
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating report status" });
  }
};