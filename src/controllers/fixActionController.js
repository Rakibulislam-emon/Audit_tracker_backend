// src/controllers/fixActionController.js

import FixAction from "../models/FixAction.js";
import Problem from "../models/Problem.js"; // Problem মডেল ইম্পোর্ট করা হলো
import { createdBy, updatedBy } from "../utils/helper.js";

// GET /api/fix-actions - With filtering, sorting, population
export const getAllFixActions = async (req, res) => {
  try {
    // Step 1: Get filter values
    const { search, problem, owner, status, actionStatus, verificationResult } =
      req.query;
    console.log("[getAllFixActions] req.query:", req.query);

    // Step 2: Create query object
    const query = {};

    // Step 3: Add filters
    if (problem) query.problem = problem;
    if (owner) query.owner = owner; // Filter by assigned owner
    if (status === "active" || status === "inactive") query.status = status; // System status
    if (
      actionStatus &&
      ["Pending", "In Progress", "Completed", "Verified", "Rejected"].includes(
        actionStatus
      )
    ) {
      query.actionStatus = actionStatus; // Operational status
    }
    if (
      verificationResult &&
      [
        "Effective",
        "Ineffective",
        "Partially Effective",
        "Not Applicable",
        "Pending Verification",
      ].includes(verificationResult)
    ) {
      query.verificationResult = verificationResult; // Filter by verification result
    }

    // Step 4: Add search filter (searches actionText and reviewNotes)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { actionText: searchRegex },
        { reviewNotes: searchRegex },
        // Add verificationMethod to search if needed
        // { verificationMethod: searchRegex },
      ];
    }

    console.log(
      "[getAllFixActions] Final Mongoose Query:",
      JSON.stringify(query)
    );

    // Step 5: Find data, populate relationships, and sort
    const fixActions = await FixAction.find(query)
      .populate("problem", "title problemStatus") // Populate problem title & status
      .populate("owner", "name email") // Populate owner details
      .populate("verifiedBy", "name email") // Populate verifier details (if exists)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ deadline: 1 }); // Sort by deadline (ascending)

    // Step 6: Count total matching documents
    const count = await FixAction.countDocuments(query);

    // Standard response format
    res.status(200).json({
      data: fixActions,
      count: count,
      message: "Fix actions fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllFixActions] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/fix-actions/:id - Update population
export const getFixActionById = async (req, res) => {
  try {
    const fixAction = await FixAction.findById(req.params.id)
      .populate("problem", "title problemStatus")
      .populate("owner", "name email")
      .populate("verifiedBy", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!fixAction)
      return res
        .status(404)
        .json({ message: "Fix action not found", success: false });

    res
      .status(200)
      .json({
        data: fixAction,
        message: "Fix action fetched successfully",
        success: true,
      });
  } catch (error) {
    console.error("[getFixActionById] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/fix-actions - Include new fields, updated error handling, link to Problem
export const createFixAction = async (req, res) => {
  try {
    // Include fields from schema
    const {
      problem,
      actionText,
      owner,
      deadline,
      actionStatus,
      reviewNotes,
      verificationMethod,
    } = req.body;

    // Validation (Required fields from schema)
    if (!problem || !actionText || !owner || !deadline) {
      return res
        .status(400)
        .json({
          message: "Problem, Action Text, Owner, and Deadline are required",
          success: false,
        });
    }
    if (new Date(deadline) < new Date()) {
      // Basic deadline validation
      // return res.status(400).json({ message: "Deadline must be a future date", success: false });
    }

    const newFixAction = new FixAction({
      problem,
      actionText,
      owner,
      deadline,
      actionStatus: actionStatus || "Pending", // Use provided or default
      reviewNotes,
      verificationMethod,
      // verifiedBy, verifiedAt, verificationResult will be updated later
      ...createdBy(req),
      // status defaults to 'active'
    });

    let savedFixAction = await newFixAction.save(); // Mongoose validates enums

    // ✅ Link this FixAction back to the Problem document
    await Problem.findByIdAndUpdate(
      problem,
      { $addToSet: { fixActions: savedFixAction._id } } // Add ID to the array if not already present
    );

    // Repopulate for response
    savedFixAction = await FixAction.findById(savedFixAction._id)
      .populate("problem", "title problemStatus")
      .populate("owner", "name email")
      .populate("verifiedBy", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res
      .status(201)
      .json({
        data: savedFixAction,
        message: "Fix action created successfully",
        success: true,
      });
  } catch (error) {
    console.error("[createFixAction] Error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((el) => el.message)
        .join(" ");
      return res
        .status(400)
        .json({
          message: messages || error.message,
          error: error.errors,
          success: false,
        });
    }
    res
      .status(400)
      .json({
        message: "Error creating fix action",
        error: error.message,
        success: false,
      });
  }
};

// PUT /api/fix-actions/:id - Include new fields, updated error handling
export const updateFixAction = async (req, res) => {
  try {
    // Include all updatable fields from schema
    const {
      problem,
      actionText,
      owner,
      deadline,
      status,
      actionStatus,
      reviewNotes,
      verificationMethod,
      verifiedBy,
      verifiedAt,
      verificationResult,
    } = req.body;
    const fixActionId = req.params.id;

    // Validation (Required fields cannot be empty on update)
    if (!problem || !actionText || !owner || !deadline) {
      return res
        .status(400)
        .json({
          message: "Problem, Action Text, Owner, and Deadline cannot be empty",
          success: false,
        });
    }
    if (new Date(deadline) < new Date()) {
      // Re-validate deadline if changed
      // return res.status(400).json({ message: "Deadline must be a future date", success: false });
    }
    // If actionStatus is 'Verified', ensure verification fields are present? (Optional stricter validation)
    if (
      actionStatus === "Verified" &&
      (!verifiedBy || !verifiedAt || !verificationResult)
    ) {
      //  return res.status(400).json({ message: "Verifier, verification date, and result are required for 'Verified' status.", success: false });
    }

    // Build update object dynamically
    const updateData = { ...updatedBy(req) };
    // Required core fields
    updateData.problem = problem;
    updateData.actionText = actionText;
    updateData.owner = owner;
    updateData.deadline = deadline;
    // Optional/Updatable fields
    if (actionStatus) updateData.actionStatus = actionStatus;
    if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes;
    if (verificationMethod !== undefined)
      updateData.verificationMethod = verificationMethod;
    if (verifiedBy !== undefined) updateData.verifiedBy = verifiedBy || null; // Allow unsetting
    if (verifiedAt !== undefined) updateData.verifiedAt = verifiedAt || null;
    if (verificationResult !== undefined)
      updateData.verificationResult = verificationResult || null;
    if (status === "active" || status === "inactive")
      updateData.status = status;

    // Find the old problem ID *before* updating
    const oldFixAction = await FixAction.findById(fixActionId).select(
      "problem"
    );

    let updatedFixAction = await FixAction.findByIdAndUpdate(
      fixActionId,
      updateData,
      { new: true, runValidators: true } // runValidators ensures enum checks
    );

    if (!updatedFixAction)
      return res
        .status(404)
        .json({ message: "Fix action not found", success: false });

    // ✅ If the related 'problem' was changed, update both old and new Problem documents
    if (
      oldFixAction &&
      oldFixAction.problem &&
      !oldFixAction.problem.equals(updatedFixAction.problem)
    ) {
      // Remove from old problem
      await Problem.findByIdAndUpdate(oldFixAction.problem, {
        $pull: { fixActions: updatedFixAction._id },
      });
      // Add to new problem
      await Problem.findByIdAndUpdate(updatedFixAction.problem, {
        $addToSet: { fixActions: updatedFixAction._id },
      });
    } else if (updatedFixAction.problem) {
      // Ensure it's in the correct problem's list (if problem wasn't changed or was added)
      await Problem.findByIdAndUpdate(updatedFixAction.problem, {
        $addToSet: { fixActions: updatedFixAction._id },
      });
    }

    // Repopulate for response
    updatedFixAction = await FixAction.findById(updatedFixAction._id)
      .populate("problem", "title problemStatus")
      .populate("owner", "name email")
      .populate("verifiedBy", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res
      .status(200)
      .json({
        data: updatedFixAction,
        message: "Fix action updated successfully",
        success: true,
      });
  } catch (error) {
    console.error("[updateFixAction] Error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((el) => el.message)
        .join(" ");
      return res
        .status(400)
        .json({
          message: messages || error.message,
          error: error.errors,
          success: false,
        });
    }
    res
      .status(400)
      .json({
        message: "Error updating fix action",
        error: error.message,
        success: false,
      });
  }
};

// DELETE /api/fix-actions/:id - Also remove link from Problem
export const deleteFixAction = async (req, res) => {
  try {
    const deletedFixAction = await FixAction.findByIdAndDelete(req.params.id);
    if (!deletedFixAction)
      return res
        .status(404)
        .json({ message: "Fix action not found", success: false });

    // ✅ Remove the link from the related Problem document
    if (deletedFixAction.problem) {
      await Problem.findByIdAndUpdate(deletedFixAction.problem, {
        $pull: { fixActions: deletedFixAction._id },
      });
    }

    res
      .status(200)
      .json({
        message: "Fix action deleted successfully",
        success: true,
        data: deletedFixAction,
      });
  } catch (error) {
    console.error("[deleteFixAction] Error:", error);
    res
      .status(500)
      .json({
        message: "Error deleting fix action",
        error: error.message,
        success: false,
      });
  }
};
