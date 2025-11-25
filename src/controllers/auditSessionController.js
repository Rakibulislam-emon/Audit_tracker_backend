// src/controllers/auditSessionController.js

import AuditSession from "../models/AuditSession.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// GET /api/audit-sessions - With filtering, sorting, population
export const getAllAuditSessions = async (req, res) => {
  try {
    // Step 1: Get filter values
    const {
      search,
      template,
      site,
      checkType,
      schedule,
      status,
      workflowStatus,
      startDate,
      endDate,
    } = req.query;
    console.log("[getAllAuditSessions] req.query:", req.query);

    // Step 2: Create query object
    const query = {};

    // Step 3: Add filters
    if (template) query.template = template;
    if (site) query.site = site;
    if (checkType) query.checkType = checkType; // Filter by optional checkType
    if (schedule) query.schedule = schedule;
    if (status === "active" || status === "inactive") query.status = status; // System status
    if (
      workflowStatus &&
      ["planned", "in-progress", "completed", "cancelled"].includes(
        workflowStatus
      )
    ) {
      query.workflowStatus = workflowStatus; // Operational status
    }
    // Date range filter (checks if session *overlaps* with the filter range)
    if (startDate)
      query.endDate = { ...query.endDate, $gte: new Date(startDate) };
    if (endDate)
      query.startDate = { ...query.startDate, $lte: new Date(endDate) };

    // Step 4: Add search filter (searches in 'title' if it exists)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.title = searchRegex; // Search in the optional title field
      // Add other fields to search if needed, e.g., populated names (requires aggregation)
    }

    console.log(
      "[getAllAuditSessions] Final Mongoose Query:",
      JSON.stringify(query)
    );

    // Step 5: Find data, populate relationships, and sort
    const auditSessions = await AuditSession.find(query)
      .populate("template", "title version") // Populate template details
      .populate("site", "name location") // Populate site details
      .populate("checkType", "name") // Populate checkType name (if exists)
      .populate("schedule", "title startDate endDate") // Populate schedule details
      .populate({
        path: "teamMembers",
        select: "user roleInTeam",
        populate: {
          path: "user",
          select: "name email role",
        },
      })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 }); // Sort by creation date (or startDate?)

    // Step 6: Count total matching documents
    const count = await AuditSession.countDocuments(query);

    // Standard response format
    res.status(200).json({
      data: auditSessions,
      count: count,
      message: "Audit sessions fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllAuditSessions] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/audit-sessions/:id - Update population
export const getAuditSessionById = async (req, res) => {
  try {
    const auditSession = await AuditSession.findById(req.params.id)
      .populate("template", "title version")
      .populate("site", "name location")
      .populate("checkType", "name")
      .populate("schedule", "title startDate endDate")
      .populate({
        path: "teamMembers",
        select: "user roleInTeam",
        populate: {
          path: "user",
          select: "name email role",
        },
      })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!auditSession)
      return res
        .status(404)
        .json({ message: "Audit session not found", success: false });

    res.status(200).json({
      data: auditSession,
      message: "Audit session fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAuditSessionById] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/audit-sessions - Include new fields, updated error handling
export const createAuditSession = async (req, res) => {
  try {
    // Include fields based on the new schema
    const {
      title,
      startDate,
      endDate,
      workflowStatus,
      template,
      site,
      checkType,
      schedule,
    } = req.body;

    // Validation (Required fields from schema)
    if (!template || !site || !schedule) {
      // checkType is optional now
      return res.status(400).json({
        message: "Template, Site, and Schedule are required",
        success: false,
      });
    }
    // Date validation if dates are provided
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return res
        .status(400)
        .json({ message: "End date must be after start date", success: false });
    }

    const newAuditSession = new AuditSession({
      title: title || null, // Handle optional title
      startDate: startDate || null, // Handle optional dates
      endDate: endDate || null,
      workflowStatus: workflowStatus || "planned", // Use provided or default
      template,
      site,
      schedule,
      checkType: checkType || null, // Handle optional checkType
      ...createdBy(req),
      // status defaults to 'active'
    });

    let savedAuditSession = await newAuditSession.save(); // Mongoose validates enum, required, unique index

    // Repopulate for response
    savedAuditSession = await AuditSession.findById(savedAuditSession._id)
      .populate("template", "title version")
      .populate("site", "name location")
      .populate("checkType", "name")
      .populate("schedule", "title startDate endDate")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(201).json({
      data: savedAuditSession,
      message: "Audit session created successfully",
      success: true,
    });
  } catch (error) {
    console.error("[createAuditSession] Error:", error);
    // Handle Unique Index Violation (schedule + site)
    if (error.code === 11000) {
      return res.status(400).json({
        message: "An audit session for this schedule and site already exists.",
        error: error.message,
        success: false,
      });
    }
    // Handle Mongoose Validation Errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((el) => el.message)
        .join(" ");
      return res.status(400).json({
        message: messages || error.message,
        error: error.errors,
        success: false,
      });
    }
    res.status(400).json({
      message: "Error creating audit session",
      error: error.message,
      success: false,
    });
  }
};

// PUT /api/audit-sessions/:id - Include new fields, updated error handling
export const updateAuditSession = async (req, res) => {
  try {
    // Include all updatable fields from schema
    const {
      title,
      startDate,
      endDate,
      workflowStatus,
      template,
      site,
      checkType,
      schedule,
      status,
    } = req.body;
    const auditSessionId = req.params.id;

    // Validation (Required fields cannot be removed)
    if (template === null || site === null || schedule === null) {
      // Check for null explicitly if needed
      return res.status(400).json({
        message: "Template, Site, and Schedule cannot be removed",
        success: false,
      });
    }
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      return res
        .status(400)
        .json({ message: "End date must be after start date", success: false });
    }

    // Build update object dynamically (only include fields present in req.body)
    const updateData = { ...updatedBy(req) };
    if (title !== undefined) updateData.title = title; // Allow setting title to empty string
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (workflowStatus) updateData.workflowStatus = workflowStatus;
    if (template) updateData.template = template; // Assuming you might want to change template? Risky.
    if (site) updateData.site = site; // Change site? Maybe restrict this.
    if (checkType !== undefined) updateData.checkType = checkType; // Allow setting/unsetting
    if (schedule) updateData.schedule = schedule; // Change schedule? Maybe restrict.
    if (status === "active" || status === "inactive")
      updateData.status = status;

    let updatedAuditSession = await AuditSession.findByIdAndUpdate(
      auditSessionId,
      updateData,
      { new: true, runValidators: true } // runValidators ensures enum, date validation
    );

    if (!updatedAuditSession)
      return res
        .status(404)
        .json({ message: "Audit session not found", success: false });

    // Repopulate for response
    updatedAuditSession = await AuditSession.findById(updatedAuditSession._id)
      .populate("template", "title version")
      .populate("site", "name location")
      .populate("checkType", "name")
      .populate("schedule", "title startDate endDate")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      data: updatedAuditSession,
      message: "Audit session updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[updateAuditSession] Error:", error);
    // Handle potential unique index conflict on update (if schedule/site changes)
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "An audit session for this schedule and site might already exist.",
        error: error.message,
        success: false,
      });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((el) => el.message)
        .join(" ");
      return res.status(400).json({
        message: messages || error.message,
        error: error.errors,
        success: false,
      });
    }
    res.status(400).json({
      message: "Error updating audit session",
      error: error.message,
      success: false,
    });
  }
};

// DELETE /api/audit-sessions/:id - No changes needed
export const deleteAuditSession = async (req, res) => {
  try {
    const deletedAuditSession = await AuditSession.findByIdAndDelete(
      req.params.id
    );
    if (!deletedAuditSession)
      return res
        .status(404)
        .json({ message: "Audit session not found", success: false });
    res.status(200).json({
      message: "Audit session deleted successfully",
      success: true,
      data: deletedAuditSession,
    });
  } catch (error) {
    console.error("[deleteAuditSession] Error:", error);
    res.status(500).json({
      message: "Error deleting audit session",
      error: error.message,
      success: false,
    });
  }
};
