// utils/reportStatusHelper.js
import mongoose from 'mongoose';

/**
 * Handles report-specific status coordination during approval workflow
 * Complements the generic updateEntityStatus in approvalController
 */
export const updateReportStatusFromApproval = async (reportId, approvalStatus) => {
  try {
    const Report = mongoose.models.Report;
    
    console.log(`🔄 Updating report status for: ${reportId}, approval: ${approvalStatus}`);

    let newReportStatus;
    let newAuditSessionStatus;

    // Map approval status to report-specific statuses
    switch (approvalStatus) {
      case "approved":
        newReportStatus = "published";
        newAuditSessionStatus = "completed";
        break;
      case "rejected":
        newReportStatus = "draft"; // Return to draft for corrections
        newAuditSessionStatus = "in-progress";
        break;
      case "pending":
        newReportStatus = "pending_approval";
        break;
      default:
        console.log(`[ReportStatus] No specific status update for: ${approvalStatus}`);
        return;
    }

    // Update report status (following your update patterns)
    if (newReportStatus) {
      await Report.findByIdAndUpdate(reportId, { 
        reportStatus: newReportStatus 
      });
      console.log(`✅ Updated report ${reportId} to: ${newReportStatus}`);
    }

    // Update audit session status if needed (side effect, don't throw)
    if (newAuditSessionStatus) {
      try {
        const report = await Report.findById(reportId).select('auditSession');
        if (report?.auditSession) {
          await mongoose.models.AuditSession.findByIdAndUpdate(report.auditSession, {
            workflowStatus: newAuditSessionStatus
          });
          console.log(`✅ Updated audit session to: ${newAuditSessionStatus}`);
        }
      } catch (sessionError) {
        console.error("[ReportStatus] Error updating audit session:", sessionError);
        // Don't throw - this is a side effect
      }
    }

  } catch (error) {
    console.error("[updateReportStatusFromApproval] Error:", error);
    // Don't throw - consistent with your helper pattern for side effects
  }
};