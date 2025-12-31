// src/controllers/exportController.js

import mongoose from "mongoose";
import Report from "../models/Report.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { createPDFTemplate } from "../utils/pdfTemplates.js";
import { updatedBy } from "../utils/helper.js";

/**
 * Export report as PDF with professional template
 * POST /api/reports/:id/export/pdf
 */
export const exportReportToPDF = asyncHandler(async (req, res, next) => {
  const reportId = req.params.id;

  try {
    const { template = "standard" } = req.body;

    // Validate template type
    const validTemplates = ["standard", "executive", "detailed"];
    if (!validTemplates.includes(template)) {
      throw new Error(
        `Invalid template type. Must be one of: ${validTemplates.join(", ")}`
      );
    }

    // Fetch report with full population
    const report = await Report.findById(reportId)
      .populate({
        path: "auditSession",
        populate: [
          {
            path: "site",
            select: "name location company",
            populate: { path: "company", select: "name" },
          },
          { path: "template", select: "title version" },
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
      });

    if (!report) {
      throw new Error("Report not found");
    }

    // Prepare branding data
    const prepareBranding = () => ({
      companyName:
        report.branding?.companyName ||
        report.auditSession?.site?.company?.name ||
        "Audit Tracker System",
      footerText:
        report.branding?.footerText ||
        "This report is confidential and for internal use only.",
      primaryColor: report.branding?.primaryColor || "#2563eb",
      logo: report.branding?.logo || null,
    });
    const branding = prepareBranding();

    console.log("=== PDF EXPORT DEBUG ===");
    console.log("Report ID:", reportId);
    console.log("Template:", template);

    // Create PDF using template
    console.log("Creating PDF template...");
    const pdfTemplate = createPDFTemplate(template, report, branding);
    console.log("PDF template created");

    console.log("Generating PDF...");
    const pdfStream = pdfTemplate.generate();
    console.log("PDF generated successfully");

    // Track export metadata
    const exportEntry = {
      type: "pdf",
      exportedAt: new Date(),
      exportedBy: req.user?.id,
      // File size will be calculated on the client side
    };

    // Update export metadata
    await Report.findByIdAndUpdate(reportId, {
      $push: { "exportMetadata.formats": exportEntry },
      $inc: { "exportMetadata.exportCount": 1 },
      $set: { "exportMetadata.lastExported": new Date() },
      ...updatedBy(req),
    });

    // Set response headers
    const filename = `${report.title.replace(
      /[^a-z0-9]/gi,
      "_"
    )}_${template}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    console.log("Streaming PDF to client...");
    // Stream PDF to response
    pdfStream.pipe(res);
    console.log("PDF stream started");
  } catch (error) {
    console.error("!!! PDF GENERATION ERROR !!!");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    // Send JSON error if headers haven't been sent, otherwise end stream
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: `Failed to generate PDF: ${error.message}`,
        stack: error.stack,
      });
    } else {
      res.end();
    }
  }
});

/**
 * Get export history for a report
 * GET /api/reports/:id/export/history
 */
export const getExportHistory = asyncHandler(async (req, res, next) => {
  const reportId = req.params.id;

  const report = await Report.findById(reportId)
    .select("exportMetadata title")
    .populate("exportMetadata.formats.exportedBy", "name email");

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  const history = {
    reportTitle: report.title,
    totalExports: report.exportMetadata?.exportCount || 0,
    lastExported: report.exportMetadata?.lastExported || null,
    exports: report.exportMetadata?.formats || [],
  };

  res.status(200).json({
    data: history,
    message: "Export history retrieved successfully",
    success: true,
  });
});

/**
 * Update report branding settings
 * PATCH /api/reports/:id/branding
 */
export const updateReportBranding = asyncHandler(async (req, res, next) => {
  const reportId = req.params.id;
  const { companyName, footerText, primaryColor, logo } = req.body;

  const updateData = {
    ...updatedBy(req),
  };

  if (companyName !== undefined)
    updateData["branding.companyName"] = companyName;
  if (footerText !== undefined) updateData["branding.footerText"] = footerText;
  if (primaryColor !== undefined)
    updateData["branding.primaryColor"] = primaryColor;
  if (logo !== undefined) updateData["branding.logo"] = logo;

  const updatedReport = await Report.findByIdAndUpdate(reportId, updateData, {
    new: true,
    runValidators: true,
  }).select("branding title");

  if (!updatedReport) {
    throw new AppError("Report not found", 404);
  }

  res.status(200).json({
    data: updatedReport,
    message: "Report branding updated successfully",
    success: true,
  });
});

/**
 * Update report template
 * PATCH /api/reports/:id/template
 */
export const updateReportTemplate = asyncHandler(async (req, res, next) => {
  const reportId = req.params.id;
  const { template } = req.body;

  const validTemplates = ["standard", "executive", "detailed", "custom"];
  if (!template || !validTemplates.includes(template)) {
    throw new AppError(
      `Invalid template. Must be one of: ${validTemplates.join(", ")}`,
      400
    );
  }

  const updatedReport = await Report.findByIdAndUpdate(
    reportId,
    { template, ...updatedBy(req) },
    { new: true, runValidators: true }
  ).select("template title");

  if (!updatedReport) {
    throw new AppError("Report not found", 404);
  }

  res.status(200).json({
    data: updatedReport,
    message: "Report template updated successfully",
    success: true,
  });
});

/**
 * Get export analytics (for dashboard)
 * GET /api/reports/export/analytics
 */
export const getExportAnalytics = asyncHandler(async (req, res, next) => {
  // Aggregate export statistics
  const analytics = await Report.aggregate([
    {
      $project: {
        exportCount: "$exportMetadata.exportCount",
        formats: "$exportMetadata.formats",
      },
    },
    {
      $unwind: { path: "$formats", preserveNullAndEmptyArrays: true },
    },
    {
      $group: {
        _id: "$formats.type",
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        format: "$_id",
        count: 1,
        _id: 0,
      },
    },
  ]);

  const totalExports = await Report.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: "$exportMetadata.exportCount" },
      },
    },
  ]);

  res.status(200).json({
    data: {
      totalExports: totalExports[0]?.total || 0,
      byFormat: analytics,
    },
    message: "Export analytics retrieved successfully",
    success: true,
  });
});
