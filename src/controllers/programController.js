// src/controllers/programController.js

import Program from "../models/Program.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// GET /api/programs - Filtering by both status and programStatus
export const getAllPrograms = async (req, res) => {
  try {
    const { search, company, status, programStatus, startDate, endDate } =
      req.query; // Both statuses
    console.log("[getAllPrograms] req.query:", req.query);

    const query = {};

    // Filter by system status (active/inactive)
    if (status === "active" || status === "inactive") {
      query.status = status; // From commonFields
    }
    // Filter by operational status
    if (
      programStatus &&
      ["planning", "in-progress", "completed", "on-hold", "cancelled"].includes(
        programStatus
      )
    ) {
      query.programStatus = programStatus;
    }
    if (company) {
      query.company = company;
    }
    // Date range filter
    if (startDate)
      query.endDate = { ...query.endDate, $gte: new Date(startDate) };
    if (endDate)
      query.startDate = { ...query.startDate, $lte: new Date(endDate) };

    // Search filter
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    console.log(
      "[getAllPrograms] Final Mongoose Query:",
      JSON.stringify(query)
    );

    const programs = await Program.find(query)
      .populate("company", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 });

    const count = await Program.countDocuments(query);

    res.status(200).json({
      data: programs,
      count: count,
      message: "Programs fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllPrograms] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/programs/:id - No change needed here for status logic
export const getProgramById = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate("company", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!program)
      return res
        .status(404)
        .json({ message: "Program not found", success: false });

    res
      .status(200)
      .json({
        data: program,
        message: "Program fetched successfully",
        success: true,
      });
  } catch (error) {
    console.error("[getProgramById] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/programs - No change needed, status defaults to 'active'
export const createProgram = async (req, res) => {
  try {
    const { name, description, startDate, endDate, programStatus, company } =
      req.body;
    if (!name || !company)
      return res
        .status(400)
        .json({ message: "Name and Company are required", success: false });

    const newProgram = new Program({
      name,
      description,
      startDate,
      endDate,
      programStatus,
      company,
      ...createdBy(req),
      // status will default to 'active' from commonFields
    });
    let savedProgram = await newProgram.save();
    savedProgram = await Program.findById(savedProgram._id) // Repopulate
      .populate("company", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res
      .status(201)
      .json({
        data: savedProgram,
        message: "Program created successfully",
        success: true,
      });
  } catch (error) {
    // ... (error handling as before) ...
    console.error("[createProgram] Error:", error);
    if (error.code === 11000)
      return res
        .status(400)
        .json({
          message: "Program name might already exist for this company.",
          error: error.message,
          success: false,
        });
    res
      .status(400)
      .json({
        message: "Error creating program",
        error: error.message,
        success: false,
      });
  }
};

// PUT /api/programs/:id - Allow updating both status and programStatus
export const updateProgram = async (req, res) => {
  try {
    // Include 'status' in destructuring if frontend sends it
    const {
      name,
      description,
      startDate,
      endDate,
      status,
      programStatus,
      company,
    } = req.body;
    const programId = req.params.id;

    if (!name || !company)
      return res
        .status(400)
        .json({ message: "Name and Company are required", success: false });

    // Build update object dynamically
    const updateData = {
      name,
      description,
      startDate,
      endDate,
      company,
      ...updatedBy(req),
    };
    // Only include statuses if they are provided in the request body
    if (status === "active" || status === "inactive") {
      updateData.status = status;
    }
    if (
      programStatus &&
      ["planning", "in-progress", "completed", "on-hold", "cancelled"].includes(
        programStatus
      )
    ) {
      updateData.programStatus = programStatus;
    }

    let updatedProgram = await Program.findByIdAndUpdate(
      programId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProgram)
      return res
        .status(404)
        .json({ message: "Program not found", success: false });

    updatedProgram = await Program.findById(updatedProgram._id) // Repopulate
      .populate("company", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res
      .status(200)
      .json({
        data: updatedProgram,
        message: "Program updated successfully",
        success: true,
      });
  } catch (error) {
    // ... (error handling as before) ...
    console.error("[updateProgram] Error:", error);
    if (error.code === 11000)
      return res
        .status(400)
        .json({
          message: "Program name might already exist for this company.",
          error: error.message,
          success: false,
        });
    res
      .status(400)
      .json({
        message: "Error updating program",
        error: error.message,
        success: false,
      });
  }
};

// DELETE /api/programs/:id - No change needed here
export const deleteProgram = async (req, res) => {
  try {
    const deletedProgram = await Program.findByIdAndDelete(req.params.id);
    if (!deletedProgram)
      return res
        .status(404)
        .json({ message: "Program not found", success: false });
    res
      .status(200)
      .json({
        message: "Program deleted successfully",
        success: true,
        data: deletedProgram,
      });
  } catch (error) {
    console.error("[deleteProgram] Error:", error);
    res
      .status(500)
      .json({
        message: "Error deleting program",
        error: error.message,
        success: false,
      });
  }
};
