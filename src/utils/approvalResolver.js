// utils/approvalResolver.js
import mongoose from 'mongoose';

/**
 * Business Rule Engine for Approver Resolution
 * Follows your helper pattern with clean, predictable behavior
 */
export const resolveApproverByBusinessRules = async (report, requestedByUserId) => {
  try {
    const User = mongoose.models.User;
    
    console.log(`🔍 Resolving approver for report: ${report.title}`);

    // Get all potential approvers sorted by role priority
    const potentialApprovers = await User.find({
      role: { 
        $in: ["audit_manager", "compliance_officer", "admin", "sysadmin"] 
      },
      isActive: true
    }).sort({ createdAt: -1 }); // Consistent with your pattern

    if (potentialApprovers.length === 0) {
      throw new Error("No active approvers found. Please ensure there are users with manager, compliance, or admin roles.");
    }

    // PRIORITY RULES (following your business logic):
    // 1. Prefer audit_manager for audit reports
    const auditManager = potentialApprovers.find(user => user.role === "audit_manager");
    if (auditManager) {
      console.log(`✅ Using audit manager: ${auditManager.name}`);
      return auditManager._id;
    }

    // 2. Fallback to compliance_officer 
    const complianceOfficer = potentialApprovers.find(user => user.role === "compliance_officer");
    if (complianceOfficer) {
      console.log(`✅ Using compliance officer: ${complianceOfficer.name}`);
      return complianceOfficer._id;
    }

    // 3. Fallback to admin/sysadmin
    const admin = potentialApprovers.find(user => 
      user.role === "admin" || user.role === "sysadmin"
    );
    if (admin) {
      console.log(`✅ Using admin fallback: ${admin.name}`);
      return admin._id;
    }

    // 4. Ultimate fallback - first available approver (shouldn't happen due to initial check)
    console.log(`✅ Using first available approver: ${potentialApprovers[0].name}`);
    return potentialApprovers[0]._id;

  } catch (error) {
    console.error("[resolveApproverByBusinessRules] Error:", error);
    throw error; // Consistent with your error handling
  }
};