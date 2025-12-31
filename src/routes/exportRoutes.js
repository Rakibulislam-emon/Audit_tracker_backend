// src/routes/exportRoutes.js

import express from "express";
import {
  exportReportToPDF,
  getExportHistory,
  updateReportBranding,
  updateReportTemplate,
  getExportAnalytics,
} from "../controllers/exportController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Test endpoint to verify pdfkit works (Public)
router.get("/test-pdf", async (req, res) => {
  try {
    console.log("TEST: Loading pdfkit...");
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    const PDFDocument = require("pdfkit");
    console.log("TEST: PDFDocument loaded:", typeof PDFDocument);

    const doc = new PDFDocument();
    console.log("TEST: PDFDocument instance created");

    // Create a dummy PDF buffer
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.send(pdfData);
    });

    doc.text("PDFKit is working correctly!");
    doc.end();
  } catch (error) {
    console.error("TEST FAILED:", error);
    res
      .status(500)
      .json({ success: false, error: error.message, stack: error.stack });
  }
});

// All other routes require authentication
router.use(auth);

/**
 * Export Routes
 */

// Export report as PDF
router.post("/:id/export/pdf", exportReportToPDF);

// Get export history for a specific report
router.get("/:id/export/history", getExportHistory);

// Update report branding
router.patch("/:id/branding", updateReportBranding);

// Update report template
router.patch("/:id/template", updateReportTemplate);

// Get export analytics (dashboard)
router.get("/export/analytics", getExportAnalytics);

export default router;
