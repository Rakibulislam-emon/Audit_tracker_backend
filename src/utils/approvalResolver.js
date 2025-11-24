// utils/approvalResolver.js
import mongoose from "mongoose";

export const resolveApproverByBusinessRules = async (
  report,
  requestedByUserId,
  req
) => {
  try {
    const User = mongoose.models.User;
    const userRole = req.user?.role;

    console.log(
      `🔍 Resolving approver for report: ${report.title}, requested by: ${requestedByUserId} (${userRole})`
    );

    // ULTIMATE FIX: Always allow admin/manager to handle their own approvals
    if (["admin", "sysadmin", "manager"].includes(userRole)) {
      console.log(
        `✅ Admin/Manager handling approval: ${requestedByUserId} (${userRole})`
      );
      return requestedByUserId;
    }

    // Get potential approvers for other roles (auditors, compliance officers, etc.)
    const potentialApprovers = await User.find({
      role: {
        $in: ["manager", "complianceOfficer", "admin", "sysadmin"],
      },
      isActive: true,
    }).sort({ createdAt: -1 });

    if (potentialApprovers.length === 0) {
      throw new Error(
        "No active approvers found. Please ensure there are users with manager, compliance, or admin roles."
      );
    }

    // Priority rules for non-admin users
    const auditManager = potentialApprovers.find(
      (user) => user.role === "manager"
    );
    if (auditManager) {
      console.log(`✅ Using audit manager: ${auditManager.name}`);
      return auditManager._id;
    }

    const complianceOfficer = potentialApprovers.find(
      (user) => user.role === "complianceOfficer"
    );
    if (complianceOfficer) {
      console.log(`✅ Using compliance officer: ${complianceOfficer.name}`);
      return complianceOfficer._id;
    }

    const admin = potentialApprovers.find(
      (user) => user.role === "admin" || user.role === "sysadmin"
    );
    if (admin) {
      console.log(`✅ Using admin fallback: ${admin.name}`);
      return admin._id;
    }

    console.log(
      `✅ Using first available approver: ${potentialApprovers[0].name}`
    );
    return potentialApprovers[0]._id;
  } catch (error) {
    console.error("[resolveApproverByBusinessRules] Error:", error);
    throw error;
  }
};
