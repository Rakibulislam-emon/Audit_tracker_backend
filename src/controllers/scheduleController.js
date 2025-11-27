import AuditSession from "../models/AuditSession.js";
import Schedule from "../models/Schedule.js";
import Site from "../models/Site.js";
import Team from "../models/Team.js";
import { createdBy, updatedBy } from "../utils/helper.js";

/**
 * Retrieves a list of schedules with advanced filtering, sorting, and population.
 * Supports filtering by company, program, status, site, and auditor.
 * @route GET /api/schedules
 */
export const getAllSchedules = async (req, res) => {
  try {
    const { search, company, program, status, scheduleStatus, site, auditor } =
      req.query;

    const query = {};

    if (company) query.company = company;
    if (program) query.program = program;
    if (status === "active" || status === "inactive") query.status = status;
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
      query.scheduleStatus = scheduleStatus;
    }
    if (site) query.site = site;
    if (auditor) query.assignedUser = auditor;

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.title = searchRegex;
    }

    const schedules = await Schedule.find(query)
      .populate("company", "name")
      .populate("program", "name")
      .populate("site", "name")
      .populate("assignedUser", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ startDate: 1 });

    const count = await Schedule.countDocuments(query);

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

/**
 * Retrieves a single schedule by its unique MongoDB ID.
 * Populates all related fields for a detailed view.
 * @route GET /api/schedules/:id
 */
export const getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate("company", "name")
      .populate("program", "name")
      .populate("site", "name")
      .populate("assignedUser", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!schedule) {
      return res
        .status(404)
        .json({ message: "Schedule not found", success: false });
    }

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

/**
 * Creates a new schedule in the database.
 * Validates required fields and date logic.
 * Handles bulk creation if purpose is 'company'.
 * @route POST /api/schedules
 */
export const createSchedule = async (req, res) => {
  try {
    const {
      title,
      startDate,
      endDate,
      company,
      program,
      scheduleStatus,
      site,
      assignedUser,
      purpose,
    } = req.body;

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

    let createdSchedules = [];

    if (purpose === "company") {
      // Fetch all active sites for the company
      const sites = await Site.find({ company, status: "active" });

      if (!sites || sites.length === 0) {
        return res.status(400).json({
          message: "No active sites found for this company.",
          success: false,
        });
      }

      // Create a schedule for each site
      const schedulePromises = sites.map((siteItem) => {
        return new Schedule({
          title: `${title} - ${siteItem.name}`,
          startDate,
          endDate,
          company,
          program: program || null,
          scheduleStatus: scheduleStatus || "scheduled",
          site: siteItem._id,
          assignedUser: assignedUser || null,
          purpose: "site", // Force purpose to 'site' for individual records
          ...createdBy(req),
        }).save();
      });

      createdSchedules = await Promise.all(schedulePromises);
    } else {
      // Single site schedule
      if (!site) {
        return res.status(400).json({
          message: "Site is required when purpose is 'site'.",
          success: false,
        });
      }

      const newSchedule = new Schedule({
        title,
        startDate,
        endDate,
        company,
        program: program || null,
        scheduleStatus: scheduleStatus || "scheduled",
        site,
        assignedUser: assignedUser || null,
        purpose,
        ...createdBy(req),
      });

      const savedSchedule = await newSchedule.save();
      createdSchedules.push(savedSchedule);
    }

    // Populate the first one for response (or all if needed, but usually list refresh handles it)
    // Sending back the list of created IDs or the first object
    res.status(201).json({
      data: createdSchedules,
      count: createdSchedules.length,
      message: `${createdSchedules.length} schedule(s) created successfully`,
      success: true,
    });
  } catch (error) {
    console.error("[createSchedule] Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "A schedule for this company/site starting on this date already exists.",
        error: error.message,
        success: false,
      });
    }
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    }
    res.status(400).json({
      message: "Error creating schedule",
      error: error.message,
      success: false,
    });
  }
};

/**
 * Updates an existing schedule by its ID.
 * Allows partial updates and enforces schema validation.
 * @route PUT /api/schedules/:id
 */
export const updateSchedule = async (req, res) => {
  try {
    const {
      title,
      startDate,
      endDate,
      company,
      program,
      status,
      scheduleStatus,
      site,
      assignedUser,
      purpose,
    } = req.body;
    const scheduleId = req.params.id;

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

    const updateData = {
      title,
      startDate,
      endDate,
      company,
      program: program || null,
      site: purpose === "site" ? site : undefined, // Only update site if purpose is site
      assignedUser: assignedUser || null,
      purpose,
      ...updatedBy(req),
    };

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

    if (!updatedSchedule) {
      return res
        .status(404)
        .json({ message: "Schedule not found", success: false });
    }

    updatedSchedule = await Schedule.findById(updatedSchedule._id)
      .populate("company", "name")
      .populate("program", "name")
      .populate("site", "name")
      .populate("assignedUser", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      data: updatedSchedule,
      message: "Schedule updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[updateSchedule] Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "A schedule for this company starting on this date already exists.",
        error: error.message,
        success: false,
      });
    }
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    }
    res.status(400).json({
      message: "Error updating schedule",
      error: error.message,
      success: false,
    });
  }
};

/**
 * Deletes a schedule by its MongoDB ID.
 * Note: This is a hard delete.
 * @route DELETE /api/schedules/:id
 */
export const deleteSchedule = async (req, res) => {
  try {
    const deletedSchedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!deletedSchedule) {
      return res
        .status(404)
        .json({ message: "Schedule not found", success: false });
    }
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
 * Atomically creates an AuditSession and Team from a single Schedule.
 * The parent Schedule's status is updated to 'in-progress' upon success.
 * @route POST /api/schedules/:id/start
 */
export const startScheduleAudits = async (req, res) => {
  try {
    const scheduleId = req.params.id;

    const schedule = await Schedule.findById(scheduleId)
      .populate({
        path: "program",
        populate: {
          path: "template",
          select: "checkType",
        },
      })
      .populate("assignedUser", "name email")
      .populate("site", "name")
      .populate("company", "name");

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
    if (!schedule.site) {
      return res.status(400).json({
        message: "No site is assigned to this schedule.",
        success: false,
      });
    }
    if (!schedule.program?.template) {
      return res.status(400).json({
        message:
          "Schedule's Program is not linked to a valid (or existing) Template.",
        success: false,
      });
    }

    const existingSessionCount = await AuditSession.countDocuments({
      schedule: schedule._id,
    });

    if (existingSessionCount > 0) {
      schedule.scheduleStatus = "in-progress";
      await schedule.save();
      return res.status(400).json({
        message:
          "Session for this schedule already exists. Status has been corrected.",
        success: false,
      });
    }

    // Generate a meaningful title for the audit session
    const dateStr = new Date(schedule.startDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const autoTitle = `${schedule.site.name} - ${
      schedule.program?.name || "Audit"
    } - ${dateStr}`;

    // Create session for the single site
    const session = await AuditSession.create({
      title: autoTitle,
      startDate: new Date(), // Set actual start date to now
      // endDate will be set when the audit is completed
      schedule: schedule._id,
      template: schedule.program.template._id,
      site: schedule.site._id,
      checkType: schedule.program.template.checkType,
      workflowStatus: "planned",
      status: "active",
      ...createdBy(req),
    });

    if (schedule.assignedUser) {
      await Team.create({
        user: schedule.assignedUser._id || schedule.assignedUser,
        roleInTeam: "lead",
        auditSession: session._id,
        status: "active",
        ...createdBy(req),
      });
    }

    schedule.scheduleStatus = "in-progress";
    await schedule.save();

    res.status(201).json({
      message: "Audit session created successfully.",
      data: [session], // Return as array for consistency with frontend expectations if any
      success: true,
    });
  } catch (error) {
    console.error("[startScheduleAudits] Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Audit session for this schedule already exists.",
        success: false,
      });
    }
    res.status(500).json({
      message: "Server error starting schedule",
      error: error.message,
    });
  }
};
