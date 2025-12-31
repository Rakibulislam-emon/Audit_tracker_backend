// src/utils/pdfTemplates.js

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const PDFDocument = require("pdfkit");

/**
 * Base Report Template Class
 * Provides common functionality for all PDF templates
 */
class BaseReportTemplate {
  constructor(report, branding = {}) {
    this.report = report;
    this.branding = {
      companyName: branding.companyName || "Audit Tracker System",
      footerText:
        branding.footerText ||
        "This report is confidential and for internal use only.",
      primaryColor: branding.primaryColor || "#2563eb",
      logo: branding.logo || null,
    };
    this.doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: report.title,
        Author: this.branding.companyName,
        Subject: "Audit Report",
        CreationDate: new Date(),
      },
      bufferPages: true, // Required for post-processing pages
    });
  }

  /**
   * Helper to ensure space for a new section.
   * If there's enough space, adds a gap. If not, adds a new page.
   * @param {number} requiredHeight - Minimum height required for the new section (default 150)
   */
  ensureNewPage(requiredHeight = 150) {
    const bottomMargin = this.doc.options.margins.bottom;
    const pageHeight = this.doc.page.height;
    const availableSpace = pageHeight - this.doc.y - bottomMargin;

    if (availableSpace < requiredHeight) {
      this.doc.addPage();
    } else {
      // If we are not at the top (approx), add spacing
      if (this.doc.y > this.doc.options.margins.top + 20) {
        this.doc.moveDown(2);
      }
    }
  }

  /**
   * Generate complete PDF and return the stream
   */
  generate() {
    this.generateCoverPage();

    // Use smart page breaking for sections
    this.generateExecutiveSummary();
    this.generateFindings();
    this.generateRiskMatrix();
    this.generateRecommendations();

    // Apply footers to all pages at the end
    this.applyFooters();

    this.doc.end();
    return this.doc;
  }

  /**
   * Apply footers to all pages
   */
  applyFooters() {
    const range = this.doc.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i++) {
      this.doc.switchToPage(i);
      const pageNum = i + 1;
      this.renderFooter(pageNum);
    }
  }

  /**
   * Render Footer content for a specific page
   */
  renderFooter(pageNum) {
    const pageHeight = this.doc.page.height;
    const footerY = pageHeight - 40;

    // Save current state
    this.doc.save();

    // Temporarily remove bottom margin to allow writing footer without triggering new page
    const originalBottomMargin = this.doc.page.margins.bottom;
    this.doc.page.margins.bottom = 0;

    // Footer text
    this.doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#9ca3af")
      .text(this.branding.footerText, 50, footerY, {
        align: "center",
        width: 495, // A4 width (595) - margins (100)
        lineBreak: false,
      });

    // Page number
    this.doc.fontSize(8).text(`Page ${pageNum}`, 50, footerY + 12, {
      align: "center",
      width: 495,
      lineBreak: false,
    });

    // Restore margin
    this.doc.page.margins.bottom = originalBottomMargin;

    // Restore state
    this.doc.restore();
  }

  /**
   * Generate cover page
   */
  generateCoverPage() {
    // Cover page always starts on the first page created in constructor
    const { title, generatedAt } = this.report;
    const { companyName } = this.branding;

    // Add logo if provided
    if (this.branding.logo) {
      try {
        this.doc.image(this.branding.logo, 50, 50, { width: 100 });
      } catch (error) {
        console.error("Error adding logo to PDF:", error);
      }
    }

    // Title
    this.doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .fillColor("#1f2937")
      .text(title, 50, 200, { align: "center", width: 495 });

    // Subtitle
    this.doc
      .fontSize(14)
      .font("Helvetica")
      .fillColor("#6b7280")
      .text("Audit Report", 50, 250, { align: "center", width: 495 });

    // Company name
    this.doc
      .fontSize(16)
      .fillColor("#374151")
      .text(companyName, 50, 350, { align: "center", width: 495 });

    // Date
    const formattedDate = new Date(generatedAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    this.doc
      .fontSize(12)
      .fillColor("#9ca3af")
      .text(`Generated on ${formattedDate}`, 50, 400, {
        align: "center",
        width: 495,
      });

    // Note: Footer is applied in applyFooters()
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary() {
    this.ensureNewPage();

    const { executiveSummary, metrics } = this.report;

    this.addSectionHeader("Executive Summary");

    // Summary text with a light background box for emphasis
    const summaryY = this.doc.y;
    this.doc
      .rect(50, summaryY, 495, 60) // approx height, logic could be dynamic but fixed for simplicity
      .fill("#f9fafb");

    this.doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#374151")
      .text(executiveSummary, 60, summaryY + 10, {
        align: "justify",
        width: 475,
        height: 40,
        ellipsis: true,
      });

    this.doc.y = summaryY + 70; // Move down past box

    this.doc.moveDown(1);

    // Metrics Dashboard (Grid Layout)
    this.addSubheader("Key Metrics Overview");

    const cardWidth = 110;
    const cardHeight = 60;
    const gap = 18;
    const startX = 50;
    const startY = this.doc.y + 10;

    const cards = [
      {
        label: "Total Findings",
        value: metrics?.totalProblems || 0,
        color: "#2563eb",
      },
      {
        label: "Critical",
        value: metrics?.criticalProblems || 0,
        color: "#dc2626",
      },
      {
        label: "High Risk",
        value: metrics?.highRiskProblems || 0,
        color: "#ea580c",
      },
      {
        label: "Overall Rating",
        value: (metrics?.overallRiskRating || "low").toUpperCase(),
        color: this.getRiskColor("risk", metrics?.overallRiskRating),
      },
    ];

    cards.forEach((card, i) => {
      const x = startX + i * (cardWidth + gap);

      // Card Box
      this.doc
        .roundedRect(x, startY, cardWidth, cardHeight, 5)
        .fillAndStroke("#ffffff", "#e5e7eb");

      // Top Border Accent
      this.doc.roundedRect(x, startY, cardWidth, 4, 2).fill(card.color);

      // Value
      this.doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .fillColor("#1f2937")
        .text(String(card.value), x, startY + 20, {
          width: cardWidth,
          align: "center",
        });

      // Label
      this.doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor("#6b7280")
        .text(card.label, x, startY + 45, {
          width: cardWidth,
          align: "center",
        });
    });

    this.doc.y = startY + cardHeight + 30; // Move cursor below cards
  }

  /**
   * Generate findings section
   */
  generateFindings() {
    this.ensureNewPage();

    const { findings } = this.report;

    this.addSectionHeader("Detailed Findings");

    if (!findings || findings.length === 0) {
      this.doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#6b7280")
        .text("No findings to report.", { align: "center", width: 495 });
      return;
    }

    findings.forEach((finding, index) => {
      // PDFKit handles page breaks automatically for text.
      // We only manually break if we are ensuring a finding block doesn't split awkwardly header-from-body.
      // A conservative check: if less than 100pts remaining, break.
      const bottomMargin = this.doc.options.margins.bottom;
      const pageHeight = this.doc.page.height;

      if (this.doc.y > pageHeight - bottomMargin - 100) {
        this.doc.addPage();
      }

      // Finding number and risk level
      const riskColor = this.getRiskColor("risk", finding.riskLevel);
      this.doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor("#1f2937")
        .text(`Finding #${index + 1}`, { continued: true })
        .fontSize(10)
        .fillColor(riskColor)
        .text(` [${(finding.riskLevel || "medium").toUpperCase()}]`, {
          continued: false,
        });

      this.doc.moveDown(0.5);

      // Description
      this.doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#374151")
        .text(finding.description || "No description provided.", {
          align: "justify",
          lineGap: 3,
          width: 495,
        });

      this.doc.moveDown(0.5);

      // Recommendation
      if (finding.recommendation) {
        this.doc
          .fontSize(9)
          .font("Helvetica-Oblique")
          .fillColor("#6b7280")
          .text(`Recommendation: ${finding.recommendation}`, {
            align: "justify",
            width: 495,
          });
      }

      this.doc.moveDown(1);
      // Separator line
      this.doc
        .strokeColor("#e5e7eb")
        .lineWidth(0.5)
        .moveTo(50, this.doc.y)
        .lineTo(545, this.doc.y)
        .stroke();
      this.doc.moveDown(1);
    });
  }

  /**
   * Generate risk matrix visualization
   */
  generateRiskMatrix() {
    this.ensureNewPage();

    const { metrics } = this.report;

    this.addSectionHeader("Risk Analysis");

    // Simple bar chart representation with defensive check for metrics
    const risks = [
      {
        label: "Critical",
        count: metrics?.criticalProblems || 0,
        color: "#dc2626",
      },
      {
        label: "High",
        count: metrics?.highRiskProblems || 0,
        color: "#ea580c",
      },
      {
        label: "Medium",
        count: metrics?.mediumRiskProblems || 0,
        color: "#f59e0b",
      },
      { label: "Low", count: metrics?.lowRiskProblems || 0, color: "#10b981" },
    ];

    const maxCount = Math.max(...risks.map((r) => r.count), 1);
    const barMaxWidth = 300;
    const startY = this.doc.y + 20;

    risks.forEach((risk, i) => {
      const y = startY + i * 50;
      const barWidth = (risk.count / maxCount) * barMaxWidth;

      // Label
      this.doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor("#374151")
        .text(risk.label, 50, y, { width: 100 });

      // Bar
      this.doc
        .rect(150, y - 5, Math.max(barWidth, 2), 20) // Ensure at least 2px width
        .fillAndStroke(risk.color, risk.color);

      // Count
      this.doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#1f2937")
        .text(String(risk.count), 150 + barWidth + 10, y);
    });

    // Update Y cursor after manual drawing
    this.doc.y = startY + risks.length * 50 + 20;
  }

  /**
   * Generate recommendations section
   */
  generateRecommendations() {
    // Only start new page if current page is somewhat full
    // But recommendations is a major section, so let's start fresh for professionalism
    this.ensureNewPage();

    const { findings } = this.report;

    this.addSectionHeader("Recommendations");

    const recommendations = findings
      .filter((f) => f.recommendation)
      .map((f) => f.recommendation);

    if (recommendations.length === 0) {
      this.doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor("#6b7280")
        .text("No specific recommendations at this time.", {
          align: "center",
          width: 495,
        });
    } else {
      recommendations.forEach((rec, i) => {
        this.doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#374151")
          .text(`${i + 1}. ${rec}`, {
            align: "justify",
            lineGap: 5,
            width: 495,
          });
        this.doc.moveDown(0.8);
      });
    }
  }

  /**
   * Add section header
   */
  addSectionHeader(title) {
    // Modern sidebar accent style
    const y = this.doc.y;
    this.doc.rect(50, y, 4, 18).fill(this.branding.primaryColor);

    this.doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#111827")
      .text(title, 60, y); // Offset text

    this.doc.moveDown(1.5);
  }

  /**
   * Add subheader
   */
  addSubheader(title) {
    this.doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .fillColor("#1f2937")
      .text(title);
    this.doc.moveDown(0.5);
  }

  // Helper for risk colors removed from here as it's same class
  // getRiskColor kept below...

  /**
   * Get color based on risk level
   */
  getRiskColor(label, value) {
    if (typeof value === "string") {
      const lowerValue = value.toLowerCase();
      if (lowerValue.includes("critical")) return "#dc2626";
      if (lowerValue.includes("high")) return "#ea580c";
      if (lowerValue.includes("medium")) return "#f59e0b";
      if (lowerValue.includes("low")) return "#10b981";
    }
    if (label.toLowerCase().includes("critical")) return "#dc2626";
    return "#374151";
  }
}

/**
 * Standard Template (Balanced)
 */
class StandardTemplate extends BaseReportTemplate {
  // Inherits generate from Base
}

/**
 * Executive Template (High-level for management)
 */
class ExecutiveTemplate extends BaseReportTemplate {
  generate() {
    this.generateCoverPage();
    this.generateExecutiveSummary();
    this.generateRiskMatrix();
    // No detailed findings, only high-level

    this.applyFooters();

    this.doc.end();
    return this.doc;
  }
}

/**
 * Detailed Template (Comprehensive technical report)
 */
class DetailedTemplate extends BaseReportTemplate {
  generate() {
    this.generateCoverPage();
    this.generateExecutiveSummary();
    this.generateRiskMatrix();
    this.generateFindings();
    this.generateRecommendations();
    this.generateAppendix();

    this.applyFooters();

    this.doc.end();
    return this.doc;
  }

  generateAppendix() {
    this.addSectionHeader("Appendix");

    this.doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#374151")
      .text("Report Metadata", { underline: true });
    this.doc.moveDown(0.5);

    const metadata = [
      ["Report ID", this.report._id || "N/A"],
      ["Generated At", new Date(this.report.generatedAt).toLocaleString()],
      ["Report Type", this.report.reportType || "N/A"],
      ["Template", this.report.template || "standard"],
      ["Total Findings", this.report.findings?.length || 0],
    ];

    metadata.forEach(([key, value]) => {
      this.doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(`${key}: `, { continued: true })
        .font("Helvetica")
        .text(String(value));
    });

    // this.addFooter(); // Removed obsolete call
  }
}

/**
 * Factory function to create templates
 */
export function createPDFTemplate(templateType, report, branding) {
  switch (templateType) {
    case "executive":
      return new ExecutiveTemplate(report, branding);
    case "detailed":
      return new DetailedTemplate(report, branding);
    case "standard":
    default:
      return new StandardTemplate(report, branding);
  }
}

export {
  BaseReportTemplate,
  StandardTemplate,
  ExecutiveTemplate,
  DetailedTemplate,
};
