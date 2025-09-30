import Approval from "../models/Approval.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// ১. Get all approvals with filtering
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
    } = req.query;

    // Build filter object
    const filter = {};
    if (approvalStatus) filter.approvalStatus = approvalStatus;
    if (priority) filter.priority = priority;
    if (entityType) filter.entityType = entityType;
    if (approver) filter.approver = approver;
    if (requestedBy) filter.requestedBy = requestedBy;

    const approvals = await Approval.find(filter)
      .populate("entityId", "title name") // Different entities have different fields
      .populate("approver", "name email role")
      .populate("requestedBy", "name email")
      .populate("decision.decisionBy", "name email")
      .populate("decision.escalatedTo", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Approval.countDocuments(filter);

    res.status(200).json({
      approvals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
      message: "Approvals retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ২. Get approval by ID
export const getApprovalById = async (req, res) => {
  try {
    const approval = await Approval.findById(req.params.id)
      .populate("entityId")
      .populate("approver", "name email role department")
      .populate("requestedBy", "name email")
      .populate("decision.decisionBy", "name email")
      .populate("decision.escalatedTo", "name email")
      .populate("requirements.completedBy", "name email")
      .populate("reviewHistory.reviewedBy", "name email");

    if (!approval) {
      return res.status(404).json({ message: "Approval not found" });
    }

    res.status(200).json({
      approval,
      message: "Approval retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ৩. Create new approval request
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

    // Validation
    if (!entityType || !entityId || !title || !description || !approver) {
      return res.status(400).json({
        message:
          "Entity type, entity ID, title, description, and approver are required",
      });
    }

    // Check if approval already exists for this entity
    const existingApproval = await Approval.findOne({
      entityType,
      entityId,
      approvalStatus: { $in: ["pending", "in-review"] },
    });

    if (existingApproval) {
      return res.status(400).json({
        message: "Pending approval already exists for this entity",
      });
    }

    const newApproval = new Approval({
      entityType,
      entityId,
      title,
      description,
      priority: priority || "medium",
      approver,
      requestedBy: req.user?.id || req.body.requestedBy,
      timeline: {
        requestedAt: new Date(),
        deadline: deadline ? new Date(deadline) : null,
      },
      requirements: requirements || [],
      ...createdBy(req),
    });

    // Add initial review history
    newApproval.reviewHistory.push({
      reviewedBy: req.user?.id || req.body.requestedBy,
      action: "submitted",
      comments: "Approval request submitted",
    });

    const savedApproval = await newApproval.save();

    // TODO: Send notification to approver

    res.status(201).json({
      savedApproval,
      message: "Approval request created successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error creating approval request" });
  }
};

// ৪. Update approval (basic info)
export const updateApproval = async (req, res) => {
  try {
    const { title, description, priority, deadline } = req.body;

    const approvalId = req.params.id;

    const updateData = {
      title,
      description,
      priority,
      ...updatedBy(req),
    };

    if (deadline) {
      updateData["timeline.deadline"] = new Date(deadline);
    }

    const updatedApproval = await Approval.findByIdAndUpdate(
      approvalId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedApproval) {
      return res.status(404).json({ message: "Approval not found" });
    }

    // Add to review history
    await updatedApproval.addReviewHistory({
      reviewedBy: req.user?.id,
      action: "updated",
      comments: "Approval request updated",
    });

    res.status(200).json({
      updatedApproval,
      message: "Approval updated successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating approval" });
  }
};

// ৫. Approve an approval request
export const approveRequest = async (req, res) => {
  try {
    const { comments } = req.body;
    const approvalId = req.params.id;
    console.log('approvalId:', approvalId)
    const userId = req.user?.id;
    console.log('userId:', userId)

    const approval = await Approval.findById(approvalId);
    console.log('approval:', approval)

    if (!approval) {
      return res.status(404).json({ message: "Approval not found" });
    }

    // Check if user is the approver
    if (approval.approver.toString() !== userId?.toString()) {
      return res.status(403).json({
        message: "You are not authorized to approve this request",
      });
    }

    // Check if all requirements are met
    const unmetRequirements = approval.requirements.filter(
      (req) => !req.completed
    );
    if (unmetRequirements.length > 0) {
      return res.status(400).json({
        message: "Cannot approve - some requirements are not completed",
        unmetRequirements: unmetRequirements.map((req) => req.description),
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

    // Add to review history
    await approval.addReviewHistory({
      reviewedBy: userId,
      action: "approved",
      comments: comments || "Request approved",
    });

    const savedApproval = await approval.save();

    // Update the entity status to "active" after approval
    await updateEntityStatus(approval.entityType, approval.entityId, "active");

    // TODO: Send notification to requester

    res.status(200).json({
      approval: savedApproval,
      message: "Approval request approved successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error approving request" });
  }
};

// ৬. Reject an approval request
export const rejectRequest = async (req, res) => {
  try {
    const { comments, reason } = req.body;
    const approvalId = req.params.id;
    const userId = req.user?.id;

    if (!comments) {
      return res.status(400).json({
        message: "Comments are required when rejecting a request",
      });
    }

    const approval = await Approval.findById(approvalId);

    if (!approval) {
      return res.status(404).json({ message: "Approval not found" });
    }

    if (approval.approver.toString() !== userId?.toString()) {
      return res.status(403).json({
        message: "You are not authorized to reject this request",
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

    await approval.addReviewHistory({
      reviewedBy: userId,
      action: "rejected",
      comments: comments,
    });

    const savedApproval = await approval.save();

    // Update the entity status to "inactive" after rejection
    await updateEntityStatus(
      approval.entityType,
      approval.entityId,
      "inactive"
    );

    res.status(200).json({
      approval: savedApproval,
      message: "Approval request rejected",
    });
  } catch (error) {
    res.status(400).json({ message: "Error rejecting request" });
  }
};

// ৭. Escalate approval request
export const escalateRequest = async (req, res) => {
  try {
    const { escalatedTo, reason, comments } = req.body;
    const approvalId = req.params.id;
    const userId = req.user?.id;

    if (!escalatedTo || !reason) {
      return res.status(400).json({
        message: "Escalated to user and reason are required",
      });
    }

    const approval = await Approval.findById(approvalId);

    if (!approval) {
      return res.status(404).json({ message: "Approval not found" });
    }

    if (approval.approver.toString() !== userId?.toString()) {
      return res.status(403).json({
        message: "You are not authorized to escalate this request",
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

    // Update approver to the escalated user
    approval.approver = escalatedTo;

    await approval.addReviewHistory({
      reviewedBy: userId,
      action: "escalated",
      comments: `Escalated to another approver. Reason: ${reason}`,
    });

    const savedApproval = await approval.save();

    // TODO: Send notification to new approver

    res.status(200).json({
      approval: savedApproval,
      message: "Approval request escalated successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error escalating request" });
  }
};

// ৮. Get approvals for current user (approver)
export const getMyApprovals = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { approvalStatus } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID not found" });
    }

    const filter = { approver: userId };
    if (approvalStatus) filter.approvalStatus = approvalStatus;

    const approvals = await Approval.find(filter)
      .populate("entityId", "title name")
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      approvals,
      message: "Your approval requests retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ৯. Update requirement status
export const updateRequirement = async (req, res) => {
  try {
    const { requirementIndex, completed } = req.body;
    const approvalId = req.params.id;
    const userId = req.user?.id;

    const approval = await Approval.findById(approvalId);

    if (!approval) {
      return res.status(404).json({ message: "Approval not found" });
    }

    if (requirementIndex >= approval.requirements.length) {
      return res.status(400).json({ message: "Invalid requirement index" });
    }

    approval.requirements[requirementIndex].completed = completed;
    approval.requirements[requirementIndex].completedAt = completed
      ? new Date()
      : null;
    approval.requirements[requirementIndex].completedBy = completed
      ? userId
      : null;

    await approval.addReviewHistory({
      reviewedBy: userId,
      action: "updated",
      comments: `Requirement "${
        approval.requirements[requirementIndex].description
      }" marked as ${completed ? "completed" : "incomplete"}`,
    });

    const savedApproval = await approval.save();

    res.status(200).json({
      approval: savedApproval,
      message: "Requirement updated successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating requirement" });
  }
};

// ১০. Add comment to approval
export const addComment = async (req, res) => {
  try {
    const { comments } = req.body;
    const approvalId = req.params.id;
    const userId = req.user?.id;

    if (!comments) {
      return res.status(400).json({ message: "Comments are required" });
    }

    const approval = await Approval.findById(approvalId);

    if (!approval) {
      return res.status(404).json({ message: "Approval not found" });
    }

    await approval.addReviewHistory({
      reviewedBy: userId,
      action: "commented",
      comments: comments,
    });

    const savedApproval = await approval.save();

    res.status(200).json({
      approval: savedApproval,
      message: "Comment added successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error adding comment" });
  }
};

// Helper function to update entity status after approval
const updateEntityStatus = async (entityType, entityId, status) => {
  try {
    let Model;
    let updateData = { status: status }; // 'active' or 'inactive'

    switch (entityType) {
      case "Report":
        Model = (await import("./Report.js")).default;
        break;
      case "Problem":
        Model = (await import("./Problem.js")).default;
        break;
      case "FixAction":
        Model = (await import("./FixAction.js")).default;
        break;
      case "AuditSession":
        Model = (await import("./AuditSession.js")).default;
        break;
      case "Template":
        Model = (await import("./Template.js")).default;
        break;
      case "Schedule":
        Model = (await import("./Schedule.js")).default;
        break;
      default:
        console.log(`No model defined for entity type: ${entityType}`);
        return;
    }

    if (Model) {
      await Model.findByIdAndUpdate(entityId, updateData);
      console.log(`Updated ${entityType} ${entityId} status to: ${status}`);
    }
  } catch (error) {
    console.error("Error updating entity status:", error);
  }
};
