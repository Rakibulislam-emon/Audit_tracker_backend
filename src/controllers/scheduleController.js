// src/controllers/scheduleController.js

import AuditSession from "../models/AuditSession.js";
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

    res.status(200).json({
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
      return res.status(400).json({
        message: "Title, Start Date, End Date, and Company are required",
        success: false,
      });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res
        .status(400)
        .json({ message: "End date must be after start date", success: false });
    }
    console.log("reached1");
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
    });
    console.log("reached2");
    console.log(newSchedule, "from 147");

    // return
    let savedSchedule = await newSchedule.save();

    // Repopulate for response
    savedSchedule = await Schedule.findById(savedSchedule._id)
      .populate("company", "name")
      .populate("program", "name")
      .populate("sites", "name")
      .populate("assignedAuditors", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(201).json({
      data: savedSchedule,
      message: "Schedule created successfully",
      success: true,
    });
  } catch (error) {
    console.error("[createSchedule] Error:", error);
    if (error.code === 11000)
      return res.status(400).json({
        message:
          "A schedule for this company starting on this date already exists.",
        error: error.message,
        success: false,
      });
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
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
      return res.status(400).json({
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

    res.status(200).json({
      data: updatedSchedule,
      message: "Schedule updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[updateSchedule] Error:", error);
    if (error.code === 11000)
      return res.status(400).json({
        message:
          "A schedule for this company starting on this date already exists.",
        error: error.message,
        success: false,
      });
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
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
    res.status(200).json({
      message: "Schedule deleted successfully",
      success: true,
      data: deletedSchedule,
    });
  } catch (error) {
    console.error("[deleteSchedule] Error:", error);
    res.status(500).json({
      message: "Error deleting schedule",
      error: error.message,
      success: false,
    });
  }
};

/**
 * @route   POST /api/schedules/:id/start
 * @desc    Ekta Schedule theke automatically AuditSession(s) to-ri kore
 * @access  Private (Admin/Manager)
 */
// ... (apnar baki shob existing controller function, jemon getAllSchedules, etc.)

// --- ✅ REPLACE YOUR OLD startScheduleAudits WITH THIS NEW, ROBUST ONE ---

/**
 * @route   POST /api/schedules/:id/start
 * @desc    Ekta Schedule theke automatically AuditSession(s) to-ri kore
 * @access  Private (Admin/Manager)
 */
export const startScheduleAudits = async (req, res) => {
  try {
    const scheduleId = req.params.id;

    // 1. Schedule-take khuje ber kori ebong populate kori
    const schedule = await Schedule.findById(scheduleId).populate({
      path: "program",
      populate: {
        path: "template",
        select: "checkType",
      },
    });

    // --- 2. Robust Validation ---
    if (!schedule) {
      return res
        .status(404)
        .json({ message: "Schedule not found", success: false });
    }
    if (schedule.scheduleStatus !== "scheduled") {
      return res.status(400).json({
        message: `Cannot start a schedule that is already '${schedule.scheduleStatus}'.`,
        success: false,
      });
    }
    if (!schedule.sites || schedule.sites.length === 0) {
      return res.status(400).json({
        message: "No sites are assigned to this schedule.",
        success: false,
      });
    }
    if (
      !schedule.program ||
      !schedule.program.template ||
      typeof schedule.program.template !== "object"
    ) {
      return res.status(400).json({
        message:
          "Schedule's Program is not linked to a valid (or existing) Template.",
        success: false,
      });
    }

    // ✅ --- 3. NOTUN VALIDATION (THE FIX) ---
    // Session create korar *agey* check kori, ei schedule-er kono session
    // agey thekei database-e ache kina.
    const existingSessionCount = await AuditSession.countDocuments({
      schedule: schedule._id,
    });

    if (existingSessionCount > 0) {
      // Jodi agey thekei session thake, kintu schedule 'scheduled' hoye thake,
      // er mane agekar transaction-ta fail korechilo.
      // Amra shudhu schedule-er status update kore dibo ebong error pathabo.
      schedule.scheduleStatus = "in-progress"; // Fix the broken status
      await schedule.save();
      return res.status(400).json({
        message:
          "Sessions for this schedule already exist. Status has been corrected.",
        success: false,
      });
    }

    // --- 4. Notun AuditSession-er List To-ri Kori ---
    // Ekhon amra nishchit (sure) je kono session agey theke nei.
    const sessionsToCreate = schedule.sites.map((siteId) => ({
      title: `${schedule.title} - ${new Date().toLocaleDateString()}`,
      schedule: schedule._id,
      template: schedule.program.template._id,
      checkType: schedule.program.template.checkType,
      site: siteId,
      workflowStatus: "in-progress",
      startDate: new Date(),
      ...createdBy(req),
    }));

    // --- 5. Database-e Shob Session Ekbare Create Kori ---
    const createdSessions = await AuditSession.insertMany(sessionsToCreate);

    // --- 6. Parent Schedule-take Update Kori ---
    schedule.scheduleStatus = "in-progress";
    await schedule.save();

    // --- 7. Frontend-ke Success Message Pathai ---
    res.status(201).json({
      message: `${createdSessions.length} audit session(s) created successfully.`,
      data: createdSessions,
      success: true,
    });
  } catch (error) {
    console.error("[startScheduleAudits] Error:", error);
    // 'insertMany' jodi abar kono karone fail kore (e.g., race condition)
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Audit sessions for this schedule and site(s) already exist.",
        success: false,
      });
    }
    res.status(500).json({
      message: "Server error starting schedule",
      error: error.message,
    });
  }
};
