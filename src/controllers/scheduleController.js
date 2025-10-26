// src/controllers/scheduleController.js

import Schedule from "../models/Schedule.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// GET /api/schedules - With filtering, sorting, population based on new schema
export const getAllSchedules = async (req, res) => {
  try {
    // Step 1: Get filter values
    const { search, company, program, status, scheduleStatus, site, auditor } =
      req.query; // Added site, auditor
    console.log("[getAllSchedules] req.query:", req.query);

    // Step 2: Create query object
    const query = {};

    // Step 3: Add filters
    if (company) query.company = company;
    if (program) query.program = program;
    if (status === "active" || status === "inactive") query.status = status; // System status
    if (
      scheduleStatus &&
      [
        "scheduled",
        "in-progress",
        "completed",
        "postponed",
        "cancelled",
      ].includes(scheduleStatus)
    ) {
      query.scheduleStatus = scheduleStatus; // Operational status
    }
    // Filter if schedule includes a specific site or auditor
    if (site) query.sites = site; // Matches if the site ID is in the sites array
    if (auditor) query.assignedAuditors = auditor; // Matches if the auditor ID is in the assignedAuditors array

    // Step 4: Add search filter (searches in 'title')
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.title = searchRegex;
    }

    console.log(
      "[getAllSchedules] Final Mongoose Query:",
      JSON.stringify(query)
    );

    // Step 5: Find data, populate relationships, and sort
    const schedules = await Schedule.find(query)
      .populate("company", "name")
      .populate("program", "name")
      .populate("sites", "name") // Populate site names
      .populate("assignedAuditors", "name email") // Populate auditor names/emails
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ startDate: 1 }); // Sort by start date

    // Step 6: Count total matching documents
    const count = await Schedule.countDocuments(query);

    // Standard response format
    res.status(200).json({
      data: schedules,
      count: count,
      message: "Schedules fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllSchedules] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/schedules/:id - Update population
export const getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate("company", "name")
      .populate("program", "name")
      .populate("sites", "name") // Populate sites
      .populate("assignedAuditors", "name email") // Populate auditors
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!schedule)
      return res
        .status(404)
        .json({ message: "Schedule not found", success: false });

    res
      .status(200)
      .json({
        data: schedule,
        message: "Schedule fetched successfully",
        success: true,
      });
  } catch (error) {
    console.error("[getScheduleById] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/schedules - Include new fields, updated error handling
export const createSchedule = async (req, res) => {
  try {
    // Include new fields from schema
    const {
      title,
      startDate,
      endDate,
      company,
      program,
      scheduleStatus,
      sites,
      assignedAuditors,
    } = req.body;

    // Validation
    if (!title || !startDate || !endDate || !company) {
      return res
        .status(400)
        .json({
          message: "Title, Start Date, End Date, and Company are required",
          success: false,
        });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res
        .status(400)
        .json({ message: "End date must be after start date", success: false });
    }

    const newSchedule = new Schedule({
      title,
      startDate,
      endDate,
      company,
      program: program || null,
      scheduleStatus: scheduleStatus || "scheduled", // Use provided or default
      sites: sites || [], // Default to empty array if not provided
      assignedAuditors: assignedAuditors || [], // Default to empty array
      ...createdBy(req),
      // status defaults to 'active' from commonFields
    });

    let savedSchedule = await newSchedule.save();

    // Repopulate for response
    savedSchedule = await Schedule.findById(savedSchedule._id)
      .populate("company", "name")
      .populate("program", "name")
      .populate("sites", "name")
      .populate("assignedAuditors", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res
      .status(201)
      .json({
        data: savedSchedule,
        message: "Schedule created successfully",
        success: true,
      });
  } catch (error) {
    console.error("[createSchedule] Error:", error);
    if (error.code === 11000)
      return res
        .status(400)
        .json({
          message:
            "A schedule for this company starting on this date already exists.",
          error: error.message,
          success: false,
        });
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res
      .status(400)
      .json({
        message: "Error creating schedule",
        error: error.message,
        success: false,
      });
  }
};

// PUT /api/schedules/:id - Include new fields, updated error handling
export const updateSchedule = async (req, res) => {
  try {
    // Include all fields from schema
    const {
      title,
      startDate,
      endDate,
      company,
      program,
      status,
      scheduleStatus,
      sites,
      assignedAuditors,
    } = req.body;
    const scheduleId = req.params.id;

    // Validation
    if (!title || !startDate || !endDate || !company) {
      return res
        .status(400)
        .json({
          message: "Title, Start Date, End Date, and Company are required",
          success: false,
        });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res
        .status(400)
        .json({ message: "End date must be after start date", success: false });
    }

    // Build update object dynamically
    const updateData = {
      title,
      startDate,
      endDate,
      company,
      program: program || null,
      sites: sites || [], // Allow updating sites array
      assignedAuditors: assignedAuditors || [], // Allow updating auditors array
      ...updatedBy(req),
    };
    // Only include statuses if they are provided
    if (status === "active" || status === "inactive")
      updateData.status = status;
    if (
      scheduleStatus &&
      [
        "scheduled",
        "in-progress",
        "completed",
        "postponed",
        "cancelled",
      ].includes(scheduleStatus)
    ) {
      updateData.scheduleStatus = scheduleStatus;
    }

    let updatedSchedule = await Schedule.findByIdAndUpdate(
      scheduleId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedSchedule)
      return res
        .status(404)
        .json({ message: "Schedule not found", success: false });

    // Repopulate for response
    updatedSchedule = await Schedule.findById(updatedSchedule._id)
      .populate("company", "name")
      .populate("program", "name")
      .populate("sites", "name")
      .populate("assignedAuditors", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res
      .status(200)
      .json({
        data: updatedSchedule,
        message: "Schedule updated successfully",
        success: true,
      });
  } catch (error) {
    console.error("[updateSchedule] Error:", error);
    if (error.code === 11000)
      return res
        .status(400)
        .json({
          message:
            "A schedule for this company starting on this date already exists.",
          error: error.message,
          success: false,
        });
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res
      .status(400)
      .json({
        message: "Error updating schedule",
        error: error.message,
        success: false,
      });
  }
};

// DELETE /api/schedules/:id - No changes needed
export const deleteSchedule = async (req, res) => {
  try {
    const deletedSchedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!deletedSchedule)
      return res
        .status(404)
        .json({ message: "Schedule not found", success: false });
    res
      .status(200)
      .json({
        message: "Schedule deleted successfully",
        success: true,
        data: deletedSchedule,
      });
  } catch (error) {
    console.error("[deleteSchedule] Error:", error);
    res
      .status(500)
      .json({
        message: "Error deleting schedule",
        error: error.message,
        success: false,
      });
  }
};
