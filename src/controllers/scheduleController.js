import Schedule from "../models/Schedule.js";
import { createdBy, updatedBy } from "../utils/helper.js";

export const getAllSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find()
      .populate("company", "name")
      .populate("program", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
    res
      .status(200)
      .json({ schedules, message: "Schedules retrieved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getScheduleById = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate("company", "name")
      .populate("program", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    res
      .status(200)
      .json({ schedule, message: "Schedule retrieved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createSchedule = async (req, res) => {
  try {
    const { title, startDate, endDate, company, program } = req.body;

    if (!title || !company || !req.user?.id) {
      return res
        .status(400)
        .json({ message: "Title, company, and user are required" });
    }

    const newSchedule = new Schedule({
      title,
      startDate,
      endDate,
      company,
      program,
      ...createdBy(req),
    });

    const savedSchedule = await newSchedule.save();
    res
      .status(201)
      .json({ savedSchedule, message: "Schedule created successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating schedule", error: error.message });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const { title, startDate, endDate, company, program } = req.body;
    const scheduleId = req.params.id;

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      scheduleId,
      { title, startDate, endDate, company, program, ...updatedBy(req) },
      { new: true, runValidators: true }
    );

    if (!updatedSchedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.status(200).json({ updatedSchedule,
      message: "Schedule updated successfully",
    });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating schedule", error: error.message });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const deletedSchedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!deletedSchedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }
    res.status(200).json({ message: "Schedule deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting schedule", error: error.message });
  }
};
