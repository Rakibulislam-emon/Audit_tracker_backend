import AuditSession from "../models/AuditSession.js";
import Schedule from "../models/Schedule.js";
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
    if (site) query.sites = site;
    if (auditor) query.assignedUser = auditor;

    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.title = searchRegex;
    }

    const schedules = await Schedule.find(query)
      .populate("company", "name")
      .populate("program", "name")
      .populate("sites", "name")
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
      .populate("sites", "name")
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
      sites,
      assignedUser,
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

    const newSchedule = new Schedule({
      title,
      startDate,
      endDate,
      company,
      program: program || null,
      scheduleStatus: scheduleStatus || "scheduled",
      sites: sites || [],
      assignedUser: assignedUser || null,
      ...createdBy(req),
    });

    let savedSchedule = await newSchedule.save();

    savedSchedule = await Schedule.findById(savedSchedule._id)
      .populate("company", "name")
      .populate("program", "name")
      .populate("sites", "name")
      .populate("assignedUser", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(201).json({
      data: savedSchedule,
      message: "Schedule created successfully",
      success: true,
    });
  } catch (error) {
    console.error("[createSchedule] Error:", error);
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
      sites,
      assignedUser,
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
      sites: sites || [],
      assignedUser: assignedUser || null,
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
      .populate("sites", "name")
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
 * Atomically creates multiple AuditSessions and Teams from a single Schedule.
 * For each site in the schedule, an AuditSession is created.
 * If an auditor is assigned to the schedule, a Team is also created for each new session.
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
      .populate("sites", "name");

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
          "Sessions for this schedule already exist. Status has been corrected.",
        success: false,
      });
    }

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

    const createdSessions = await AuditSession.insertMany(sessionsToCreate);

    if (schedule.assignedUser) {
      const teamPromises = createdSessions.map((session) => {
        const teamData = {
          user: schedule.assignedUser._id || schedule.assignedUser,
          roleInTeam: "lead",
          auditSession: session._id,
          ...createdBy(req),
        };
        return Team.create(teamData);
      });

      await Promise.all(teamPromises);
    }

    schedule.scheduleStatus = "in-progress";
    await schedule.save();

    const successMessage = `${
      createdSessions.length
    } audit session(s) created successfully.${
      schedule.assignedUser ? " Teams auto-created with assigned user." : ""
    }`;

    res.status(201).json({
      message: successMessage,
      data: createdSessions,
      success: true,
    });
  } catch (error) {
    console.error("[startScheduleAudits] Error:", error);
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
