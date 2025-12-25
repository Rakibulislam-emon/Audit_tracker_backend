// src/controllers/approvalController.js

import Approval from "../models/Approval.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// Helper function to update entity status after approval
// (Note: This uses dynamic imports, ensure models are correctly referenced)
const updateEntityStatus = async (entityType, entityId, status) => {
  try {
    let Model;
    // Map string from enum to actual Model
    switch (entityType) {
      case "Report":
        Model = (await import("../models/Report.js")).default;
        break;
      case "Problem":
        Model = (await import("../models/Problem.js")).default;
        break;
      case "FixAction":
        Model = (await import("../models/FixAction.js")).default;
        break;
      case "AuditSession":
        Model = (await import("../models/AuditSession.js")).default;
        break;
      case "Template":
        Model = (await import("../models/Template.js")).default;
        break;
      case "Schedule":
        Model = (await import("../models/Schedule.js")).default;
        break;
      default:
        console.warn(
          `[Helper] No model mapping found for entity type: ${entityType}`
        );
        return;
    }
    // Update the common 'status' field (active/inactive)
    await Model.findByIdAndUpdate(entityId, { status: status });
    console.log(
      `[Helper] Updated ${entityType} ${entityId} system status to: ${status}`
    );
  } catch (error) {
    console.error("[Helper] Error updating entity status:", error);
    // Do not throw, as this is a side-effect
  }
};

// ১. Get all approvals with filtering (✅ Updated for standard response, search)
export const getAllApprovals = async (req, res) => {
  try {
    const {
      approvalStatus,
      priority,
      entityType,
      approver,
      requestedBy,
      page = 1,
      limit = 10,
      search, // Added search
    } = req.query;

    const filter = {};
    if (approvalStatus) filter.approvalStatus = approvalStatus;
    if (priority) filter.priority = priority;
    if (entityType) filter.entityType = entityType;
    if (approver) filter.approver = approver;
    if (requestedBy) filter.requestedBy = requestedBy;

    // Add search filter (for title and description)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      filter.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
      populate: [
        { path: "entityId", select: "title name questionText actionText" },
        { path: "approver", select: "name email role" },
        { path: "requestedBy", select: "name email" },
        { path: "decision.decisionBy", select: "name email" },
        { path: "decision.escalatedTo", select: "name email" },
        { path: "createdBy", select: "name email" },
        { path: "updatedBy", select: "name email" }, // ✅ Added updatedBy
      ],
    };

    const approvals = await Approval.find(filter)
      .populate(options.populate)
      .sort(options.sort)
      .limit(options.limit)
      .skip((options.page - 1) * options.limit);

    const total = await Approval.countDocuments(filter);

    res.status(200).json({
      data: approvals, // ✅ Standard 'data' key
      count: total, // ✅ Standard 'count' key
      message: "Approvals retrieved successfully",
      success: true, // ✅ Added success flag
      pagination: {
        // Keep pagination info
        currentPage: options.page,
        totalPages: Math.ceil(total / options.limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("[getAllApprovals] Error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

// ২. Get approval by ID (✅ Standard Response, updatedBy population)
export const getApprovalById = async (req, res) => {
  try {
    const approval = await Approval.findById(req.params.id)
      .populate("entityId")
      .populate("approver", "name email role department")
      .populate("requestedBy", "name email")
      .populate("decision.decisionBy", "name email")
      .populate("decision.escalatedTo", "name email")
      .populate("requirements.completedBy", "name email")
      .populate("reviewHistory.reviewedBy", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email"); // ✅ Added updatedBy

    if (!approval) {
      return res
        .status(404)
        .json({ message: "Approval not found", success: false });
    }

    res.status(200).json({
      data: approval, // ✅ Standard 'data' key
      message: "Approval retrieved successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getApprovalById] Error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

// ৩. Create new approval request (✅ Standard Response, validation, helper fix)
export const createApproval = async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      title,
      description,
      priority,
      approver,
      deadline,
      requirements,
    } = req.body;

    if (!entityType || !entityId || !title || !description || !approver) {
      return res.status(400).json({
        message:
          "Entity type, entity ID, title, description, and approver are required",
        success: false,
      });
    }

    const existingApproval = await Approval.findOne({
      entityType,
      entityId,
      approvalStatus: { $in: ["pending", "in-review"] },
    });
    if (existingApproval) {
      return res.status(400).json({
        message: "A pending approval request already exists for this item.",
        success: false,
      });
    }

    const newApproval = new Approval({
      entityType,
      entityId,
      title,
      description,
      priority: priority || "medium",
      approver,
      requestedBy: req.user?.id, // Use logged in user
      timeline: {
        requestedAt: new Date(),
        deadline: deadline ? new Date(deadline) : null,
      },
      requirements: requirements || [],
      ...createdBy(req), // ✅ Use common helper
      status: "active", // Default to active
    });

    // Add initial review history
    newApproval.reviewHistory.push({
      reviewedBy: req.user?.id,
      action: "submitted",
      comments: "Approval request submitted",
      reviewedAt: new Date(), // ✅ Added timestamp
    });

    let savedApproval = await newApproval.save();

    // Populate for response
    savedApproval = await Approval.findById(savedApproval._id)
      .populate("entityId", "title name questionText actionText")
      .populate("approver", "name email")
      .populate("requestedBy", "name email")
      .populate("createdBy", "name email");

    // TODO: Send notification to approver

    res.status(201).json({
      data: savedApproval, // ✅ Standard 'data' key
      message: "Approval request created successfully",
      success: true,
    });
  } catch (error) {
    console.error("[createApproval] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error creating approval request",
      error: error.message,
      success: false,
    });
  }
};

// ৪. Update approval (basic info) (✅ Standard Response, validation, helper fix)
// In updateApproval function - fix the reviewHistory action
export const updateApproval = async (req, res) => {
  try {
    const { title, description, priority, deadline, status, requirements } =
      req.body;
    const approvalId = req.params.id;

    const updateData = { ...updatedBy(req) };
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (priority) updateData.priority = priority;
    if (status === "active" || status === "inactive")
      updateData.status = status;
    if (deadline) updateData["timeline.deadline"] = new Date(deadline);
    if (requirements) updateData.requirements = requirements;

    const approval = await Approval.findById(approvalId);
    if (!approval) {
      return res
        .status(404)
        .json({ message: "Approval not found", success: false });
    }

    // ✅ FIX: Use valid enum value for reviewHistory action
    approval.reviewHistory.push({
      reviewedBy: req.user?.id,
      action: "reviewed", // ✅ CHANGED from "updated" to "reviewed"
      comments: "Approval request basic details updated",
      reviewedAt: new Date(),
    });

    // Apply updates
    Object.assign(approval, updateData);
    const updatedApproval = await approval.save({
      new: true,
      runValidators: true,
    });

    // Repopulate
    const populatedApproval = await Approval.findById(
      updatedApproval._id
    ).populate("approver requestedBy createdBy updatedBy entityId");

    res.status(200).json({
      data: populatedApproval,
      message: "Approval updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[updateApproval] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error updating approval",
      error: error.message,
      success: false,
    });
  }
};

// Add this to your approvalController.js - DELETE approval
export const deleteApproval = async (req, res) => {
  try {
    const approvalId = req.params.id;

    const deletedApproval = await Approval.findByIdAndDelete(approvalId);

    if (!deletedApproval) {
      return res.status(404).json({
        message: "Approval not found",
        success: false,
      });
    }

    res.status(200).json({
      data: deletedApproval,
      message: "Approval deleted successfully",
      success: true,
    });
  } catch (error) {
    console.error("[deleteApproval] Error:", error);
    res.status(500).json({
      message: "Error deleting approval",
      error: error.message,
      success: false,
    });
  }
};

// Add this after the updateEntityStatus function and before getAllApprovals

// Industry-standard permission check
const canUserApprove = (approval, user) => {
  // RULE 1: Assigned approver can always act
  const isAssignedApprover =
    approval.approver?.toString() === user.id?.toString() ||
    approval.approver?.toString() === user._id?.toString();

  if (isAssignedApprover) {
    return true;
  }

  // RULE 1.5: Admins, SysAdmins, and Approvers have approval authority
  if (
    ["admin", "sysadmin", "approver", "superAdmin", "groupAdmin"].includes(
      user.role
    )
  ) {
    console.log(`✅ ${user.role} approval authority`);
    return true;
  }

  // RULE 2: Compliance Officer has final authority on all approvals
  if (user.role === "complianceOfficer") {
    console.log(`✅ Compliance Officer review - final authority`);
    return true;
  }

  // RULE 3: Escalation path for overdue approvals (manager role)
  const isOverdue =
    approval.timeline?.deadline &&
    new Date() > new Date(approval.timeline.deadline);

  // Managers can approve if overdue OR if unassigned (pool)
  if (user.role === "manager") {
    if (isOverdue) return true;
    if (!approval.approver) return true; // Unassigned
  }

  // RULE 4: Emergency override for critical items (sysadmin only) - Redundant now but keeping for clarity
  if (approval.priority === "critical" && user.role === "sysadmin") {
    return true;
  }

  return false;
};

// ৫. Approve an approval request (✅ Standard Response, validation, helper fix)
// ৫. Approve an approval request - UPDATED WITH INDUSTRY LOGIC
export const approveRequest = async (req, res) => {
  try {
    const { comments } = req.body;
    const approvalId = req.params.id;
    const userId = req.user?.id;
    const userRole = req.user?.role; // ADD THIS LINE

    const approval = await Approval.findById(approvalId);
    if (!approval)
      return res
        .status(404)
        .json({ message: "Approval not found", success: false });

    // ✅ REPLACE THIS CHECK with the new permission logic
    // OLD: if (approval.approver.toString() !== userId?.toString()) {
    // NEW:
    if (!canUserApprove(approval, { id: userId, role: userRole })) {
      return res.status(403).json({
        message: "You are not authorized to approve this request",
        success: false,
      });
    }

    const unmetRequirements = approval.requirements.filter(
      (req) => !req.completed
    );
    if (unmetRequirements.length > 0) {
      return res.status(400).json({
        message: "Cannot approve - requirements not completed",
        unmetRequirements,
        success: false,
      });
    }

    approval.approvalStatus = "approved";
    approval.decision = {
      decision: "approved",
      decisionBy: userId,
      decisionAt: new Date(),
      comments: comments || "Approved",
    };
    approval.timeline.respondedAt = new Date();

    // Add context to comments for audit trail
    const isAssignedApprover =
      approval.approver.toString() === userId?.toString();
    const actionContext = isAssignedApprover ? "" : ` (${userRole} override)`;

    approval.reviewHistory.push({
      reviewedBy: userId,
      action: "approved",
      comments: `${comments || "Request approved"}${actionContext}`,
      reviewedAt: new Date(),
    });

    let savedApproval = await approval.save();

    // Update the related entity's system status to "active"
    await updateEntityStatus(approval.entityType, approval.entityId, "active");

    // 🔧 NEW: If this is a FixAction approval, update verification fields AND problem status
    if (approval.entityType === "FixAction") {
      try {
        const FixAction = (await import("../models/FixAction.js")).default;
        const Problem = (await import("../models/Problem.js")).default;

        // Get the fix action to find the related problem
        const fixAction = await FixAction.findById(approval.entityId).populate(
          "problem"
        );

        if (fixAction) {
          // ✅ AUTO-POPULATE VERIFICATION FIELDS when approved
          await FixAction.findByIdAndUpdate(approval.entityId, {
            verifiedBy: userId,
            verifiedAt: new Date(),
            verificationResult: "Effective", // Default to Effective, can be changed later
            actionStatus: "Verified", // Change status to Verified
          });
          console.log(
            `✅ FixAction ${approval.entityId} verification fields auto-populated`
          );

          // Update related problem status to "Resolved"
          if (fixAction.problem) {
            await Problem.findByIdAndUpdate(
              fixAction.problem._id || fixAction.problem,
              {
                problemStatus: "Resolved",
              }
            );
            console.log(
              `✅ Problem ${
                fixAction.problem._id || fixAction.problem
              } status updated to "Resolved"`
            );
          }
        }
      } catch (error) {
        console.error("Error updating fix action verification:", error);
        // Don't fail the approval if verification update fails
      }
    }

    // Repopulate
    savedApproval = await Approval.findById(savedApproval._id)
      .populate("entityId", "title name questionText actionText")
      .populate("approver", "name email")
      .populate("requestedBy", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      data: savedApproval,
      message: "Approval request approved successfully",
      success: true,
    });
  } catch (error) {
    console.error("[approveRequest] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error approving request",
      error: error.message,
      success: false,
    });
  }
};

// ৬. Reject an approval request - UPDATED WITH INDUSTRY LOGIC
export const rejectRequest = async (req, res) => {
  try {
    const { comments } = req.body;
    const approvalId = req.params.id;
    const userId = req.user?.id;
    const userRole = req.user?.role; // ADD THIS LINE

    if (!comments) {
      return res.status(400).json({
        message: "Comments are required when rejecting a request",
        success: false,
      });
    }

    const approval = await Approval.findById(approvalId);
    if (!approval)
      return res
        .status(404)
        .json({ message: "Approval not found", success: false });

    // ✅ REPLACE THIS CHECK with the new permission logic
    // OLD: if (approval.approver.toString() !== userId?.toString()) {
    // NEW:
    if (!canUserApprove(approval, { id: userId, role: userRole })) {
      return res.status(403).json({
        message: "You are not authorized to reject this request",
        success: false,
      });
    }

    approval.approvalStatus = "rejected";
    approval.decision = {
      decision: "rejected",
      decisionBy: userId,
      decisionAt: new Date(),
      comments: comments,
    };
    approval.timeline.respondedAt = new Date();

    // Add context to comments for audit trail
    const isAssignedApprover =
      approval.approver.toString() === userId?.toString();
    const actionContext = isAssignedApprover ? "" : ` (${userRole} override)`;

    approval.reviewHistory.push({
      reviewedBy: userId,
      action: "rejected",
      comments: `${comments}${actionContext}`,
      reviewedAt: new Date(),
    });

    let savedApproval = await approval.save();

    // Update the related entity's system status to "inactive"
    await updateEntityStatus(
      approval.entityType,
      approval.entityId,
      "inactive"
    );

    // 🔧 NEW: If this is a FixAction rejection, update the related Problem status back to "Open"
    if (approval.entityType === "FixAction") {
      try {
        const FixAction = (await import("../models/FixAction.js")).default;
        const Problem = (await import("../models/Problem.js")).default;

        // Get the fix action to find the related problem
        const fixAction = await FixAction.findById(approval.entityId).populate(
          "problem"
        );

        if (fixAction && fixAction.problem) {
          // Update problem status back to "Open" when fix action is rejected
          await Problem.findByIdAndUpdate(
            fixAction.problem._id || fixAction.problem,
            {
              problemStatus: "Open",
            }
          );
          console.log(
            `✅ Problem ${
              fixAction.problem._id || fixAction.problem
            } status updated back to "Open"`
          );
        }
      } catch (error) {
        console.error("Error updating problem status:", error);
        // Don't fail the rejection if problem update fails
      }
    }

    // Repopulate
    savedApproval = await Approval.findById(savedApproval._id)
      .populate("entityId", "title name questionText actionText")
      .populate("approver", "name email")
      .populate("requestedBy", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      data: savedApproval,
      message: "Approval request rejected",
      success: true,
    });
  } catch (error) {
    console.error("[rejectRequest] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error rejecting request",
      error: error.message,
      success: false,
    });
  }
};

// ৭. Escalate approval request (✅ Standard Response, validation, helper fix)
export const escalateRequest = async (req, res) => {
  try {
    const { escalatedTo, reason, comments } = req.body;
    const approvalId = req.params.id;
    const userId = req.user?.id;

    if (!escalatedTo || !reason) {
      return res.status(400).json({
        message: "Escalated to user and reason are required",
        success: false,
      });
    }

    const approval = await Approval.findById(approvalId);
    if (!approval)
      return res
        .status(404)
        .json({ message: "Approval not found", success: false });

    if (approval.approver.toString() !== userId?.toString()) {
      return res.status(403).json({
        message: "You are not authorized to escalate this request",
        success: false,
      });
    }

    approval.approvalStatus = "escalated";
    approval.decision = {
      decision: "escalated",
      decisionBy: userId,
      decisionAt: new Date(),
      escalationReason: reason,
      escalatedTo: escalatedTo,
      comments: comments,
    };
    approval.approver = escalatedTo; // Update approver to the new user

    // ✅ Manually add to review history
    approval.reviewHistory.push({
      reviewedBy: userId,
      action: "escalated",
      comments: `Escalated to new approver. Reason: ${reason}. ${
        comments || ""
      }`.trim(),
      reviewedAt: new Date(),
    });

    let savedApproval = await approval.save();

    // Repopulate
    savedApproval = await Approval.findById(savedApproval._id)
      .populate("entityId", "title name questionText actionText")
      .populate("approver", "name email")
      .populate("requestedBy", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      data: savedApproval, // ✅ Standard 'data' key
      message: "Approval request escalated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[escalateRequest] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error escalating request",
      error: error.message,
      success: false,
    });
  }
};

// ৮. Get approvals for current user (approver) (✅ Standard Response)
export const getMyApprovals = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { approvalStatus } = req.query;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "User ID not found", success: false });
    }

    const filter = { approver: userId };

    // If user is Manager or Admin/Sysadmin, also show unassigned approvals
    const privilegedRoles = ["manager", "admin", "sysadmin"];
    if (privilegedRoles.includes(req.user?.role)) {
      // Show assigned to me OR unassigned
      delete filter.approver;
      filter.$or = [
        { approver: userId },
        { approver: null },
        { approver: { $exists: false } },
      ];
    }

    if (approvalStatus) filter.approvalStatus = approvalStatus;

    const approvals = await Approval.find(filter)
      .populate("entityId", "title name questionText actionText")
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 });

    const total = await Approval.countDocuments(filter);

    res.status(200).json({
      data: approvals, // ✅ Standard 'data' key
      count: total, // ✅ Added count
      message: "Your approval requests retrieved successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getMyApprovals] Error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

// ৯. Update requirement status (✅ Standard Response, validation, helper fix)
// In approvalController.js - FIX THE updateRequirement FUNCTION
export const updateRequirement = async (req, res) => {
  try {
    const { requirementIndex, completed } = req.body;
    const approvalId = req.params.id;
    const userId = req.user?.id;

    const approval = await Approval.findById(approvalId);
    if (!approval)
      return res
        .status(404)
        .json({ message: "Approval not found", success: false });

    if (
      requirementIndex === undefined ||
      requirementIndex < 0 ||
      requirementIndex >= approval.requirements.length
    ) {
      return res
        .status(400)
        .json({ message: "Invalid requirement index", success: false });
    }

    approval.requirements[requirementIndex].completed = completed;
    approval.requirements[requirementIndex].completedAt = completed
      ? new Date()
      : null;
    approval.requirements[requirementIndex].completedBy = completed
      ? userId
      : null;

    // ✅ FIX: Use valid enum value "reviewed" instead of "updated"
    approval.reviewHistory.push({
      reviewedBy: userId,
      action: "reviewed", // ✅ CHANGED from "updated" to "reviewed"
      comments: `Requirement "${
        approval.requirements[requirementIndex].description
      }" marked as ${completed ? "completed" : "incomplete"}.`,
      reviewedAt: new Date(),
    });

    const savedApproval = await approval.save();

    res.status(200).json({
      data: savedApproval,
      message: "Requirement updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[updateRequirement] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error updating requirement",
      error: error.message,
      success: false,
    });
  }
};

// ۱۰. Add comment to approval (✅ Standard Response, validation, helper fix)
export const addComment = async (req, res) => {
  try {
    const { comments } = req.body;
    const approvalId = req.params.id;
    const userId = req.user?.id;

    if (!comments) {
      return res
        .status(400)
        .json({ message: "Comments are required", success: false });
    }

    const approval = await Approval.findById(approvalId);
    if (!approval)
      return res
        .status(404)
        .json({ message: "Approval not found", success: false });

    // ✅ Manually add to review history
    approval.reviewHistory.push({
      reviewedBy: userId,
      action: "commented",
      comments: comments,
      reviewedAt: new Date(),
    });

    const savedApproval = await approval.save();

    res.status(200).json({
      data: savedApproval, // ✅ Standard 'data' key
      message: "Comment added successfully",
      success: true,
    });
  } catch (error) {
    console.error("[addComment] Error:", error);
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error adding comment",
      error: error.message,
      success: false,
    });
  }
};

// audit-backend/src/controllers/approvalController.js - ADD BULK METHODS

// 11. Bulk Approve multiple approvals
export const bulkApproveRequests = async (req, res) => {
  try {
    const { approvalIds, comments = "" } = req.body;
    const userId = req.user?.id;

    if (
      !approvalIds ||
      !Array.isArray(approvalIds) ||
      approvalIds.length === 0
    ) {
      return res.status(400).json({
        message: "Approval IDs array is required",
        success: false,
      });
    }

    const results = {
      successful: [],
      failed: [],
    };

    // Process each approval
    for (const approvalId of approvalIds) {
      try {
        const approval = await Approval.findById(approvalId);

        if (!approval) {
          results.failed.push({
            approvalId,
            error: "Approval not found",
          });
          continue;
        }

        // Check permissions
        if (approval.approver.toString() !== userId?.toString()) {
          results.failed.push({
            approvalId,
            error: "Not authorized to approve this request",
          });
          continue;
        }

        // Check requirements
        const unmetRequirements = approval.requirements.filter(
          (req) => !req.completed
        );
        if (unmetRequirements.length > 0) {
          results.failed.push({
            approvalId,
            error: "Requirements not completed",
            unmetRequirements,
          });
          continue;
        }

        // Approve the request
        approval.approvalStatus = "approved";
        approval.decision = {
          decision: "approved",
          decisionBy: userId,
          decisionAt: new Date(),
          comments: comments || "Bulk approved",
        };
        approval.timeline.respondedAt = new Date();

        approval.reviewHistory.push({
          reviewedBy: userId,
          action: "approved",
          comments: comments || "Bulk approved",
          reviewedAt: new Date(),
        });

        const savedApproval = await approval.save();

        // Update related entity status
        await updateEntityStatus(
          approval.entityType,
          approval.entityId,
          "active"
        );

        results.successful.push({
          approvalId,
          title: approval.title,
          entityType: approval.entityType,
        });
      } catch (error) {
        results.failed.push({
          approvalId,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      data: results,
      message: `Bulk approval completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      success: true,
    });
  } catch (error) {
    console.error("[bulkApproveRequests] Error:", error);
    res.status(500).json({
      message: "Error processing bulk approval",
      error: error.message,
      success: false,
    });
  }
};

// 12. Bulk Reject multiple approvals
export const bulkRejectRequests = async (req, res) => {
  try {
    const { approvalIds, comments = "" } = req.body;
    const userId = req.user?.id;

    if (
      !approvalIds ||
      !Array.isArray(approvalIds) ||
      approvalIds.length === 0
    ) {
      return res.status(400).json({
        message: "Approval IDs array is required",
        success: false,
      });
    }

    if (!comments.trim()) {
      return res.status(400).json({
        message: "Comments are required for bulk rejection",
        success: false,
      });
    }

    const results = {
      successful: [],
      failed: [],
    };

    for (const approvalId of approvalIds) {
      try {
        const approval = await Approval.findById(approvalId);

        if (!approval) {
          results.failed.push({
            approvalId,
            error: "Approval not found",
          });
          continue;
        }

        if (approval.approver.toString() !== userId?.toString()) {
          results.failed.push({
            approvalId,
            error: "Not authorized to reject this request",
          });
          continue;
        }

        // Reject the request
        approval.approvalStatus = "rejected";
        approval.decision = {
          decision: "rejected",
          decisionBy: userId,
          decisionAt: new Date(),
          comments: comments,
        };
        approval.timeline.respondedAt = new Date();

        approval.reviewHistory.push({
          reviewedBy: userId,
          action: "rejected",
          comments: comments,
          reviewedAt: new Date(),
        });

        const savedApproval = await approval.save();

        // Update related entity status
        await updateEntityStatus(
          approval.entityType,
          approval.entityId,
          "inactive"
        );

        results.successful.push({
          approvalId,
          title: approval.title,
          entityType: approval.entityType,
        });
      } catch (error) {
        results.failed.push({
          approvalId,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      data: results,
      message: `Bulk rejection completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      success: true,
    });
  } catch (error) {
    console.error("[bulkRejectRequests] Error:", error);
    res.status(500).json({
      message: "Error processing bulk rejection",
      error: error.message,
      success: false,
    });
  }
};
