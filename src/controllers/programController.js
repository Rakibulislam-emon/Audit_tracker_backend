/**
 * @fileoverview Controller for handling all CRUD operations for the Program resource.
 * @module controllers/programController
 */

import Program from "../models/Program.js";
import { createdBy, updatedBy } from "../utils/helper.js";

/**
 * Retrieves a list of programs with advanced filtering, searching, and sorting.
 * Supports filtering by company, template, status, date ranges, and more.
 * @route GET /api/programs
 * @access Public/Protected (depending on middleware)
 */
export const getAllPrograms = async (req, res) => {
  try {
    const {
      search,
      company,
      status,
      programStatus,
      startDate,
      endDate,
      template,
      frequency,
      responsibleDept,
    } = req.query;

    // Dynamically construct the filter object based on provided query parameters.
    const query = {};

    // Apply filters for relational fields (ObjectId) and enums.
    if (company) query.company = company;
    if (template) query.template = template;
    if (frequency) query.frequency = frequency;
    if (status === "active" || status === "inactive") query.status = status;
    if (
      programStatus &&
      ["planning", "in-progress", "completed", "on-hold", "cancelled"].includes(
        programStatus
      )
    ) {
      query.programStatus = programStatus;
    }

    // Filter for programs whose date range overlaps with the provided range.
    if (startDate)
      query.endDate = { ...query.endDate, $gte: new Date(startDate) };
    if (endDate)
      query.startDate = { ...query.startDate, $lte: new Date(endDate) };

    // Implement a case-insensitive text search across multiple relevant fields.
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { responsibleDept: searchRegex },
      ];
    }

    if (responsibleDept && !search) {
      query.responsibleDept = { $regex: responsibleDept, $options: "i" };
    }

    // Execute the query, populating related documents for a complete response.
    const programs = await Program.find(query)
      .populate("company", "name")
      .populate("template", "title version")
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

/**
 * Retrieves a single program by its unique MongoDB ID.
 * Populates all related fields for detailed view.
 * @route GET /api/programs/:id
 */
export const getProgramById = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate("company", "name")
      .populate("template", "title version")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!program) {
      return res
        .status(404)
        .json({ message: "Program not found", success: false });
    }

    res.status(200).json({
      data: program,
      message: "Program fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getProgramById] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Creates a new program in the database.
 * Validates required fields and attaches creator information.
 * @route POST /api/programs
 */
export const createProgram = async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      programStatus,
      company,
      template,
      frequency,
      responsibleDept,
    } = req.body;

    // Basic server-side validation for required fields.
    if (!name || !company || !template) {
      return res.status(400).json({
        message: "Name, Company, and Template are required fields.",
        success: false,
      });
    }

    const newProgram = new Program({
      name,
      description,
      startDate,
      endDate,
      programStatus,
      company,
      template,
      frequency,
      responsibleDept,
      ...createdBy(req), // Attach the creator's information from the request context.
    });

    let savedProgram = await newProgram.save();

    // Re-fetch the new document with populated relations for a complete response.
    savedProgram = await Program.findById(savedProgram._id)
      .populate("company", "name")
      .populate("template", "title version")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(201).json({
      data: savedProgram,
      message: "Program created successfully",
      success: true,
    });
  } catch (error) {
    console.error("[createProgram] Error:", error);
    // Handle potential MongoDB duplicate key errors (e.g., unique name).
    if (error.code === 11000) {
      return res.status(400).json({
        message: "A program with this name might already exist.",
        error: error.message,
        success: false,
      });
    }
    res.status(400).json({
      message: "Error creating program",
      error: error.message,
      success: false,
    });
  }
};

/**
 * Updates an existing program by its ID.
 * Allows partial updates and enforces schema validation.
 * @route PUT /api/programs/:id
 */
export const updateProgram = async (req, res) => {
  try {
    const {
      name,
      description,
      startDate,
      endDate,
      status,
      programStatus,
      company,
      template,
      frequency,
      responsibleDept,
    } = req.body;
    const programId = req.params.id;

    if (!name || !company || !template) {
      return res.status(400).json({
        message: "Name, Company, and Template are required fields.",
        success: false,
      });
    }

    // Build the update payload, only including fields that were sent in the request.
    const updateData = {
      name,
      description,
      startDate,
      endDate,
      company,
      template,
      frequency,
      responsibleDept,
      ...updatedBy(req), // Attach the updater's information.
    };

    // Conditionally update status fields to avoid accidental overrides if not provided.
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

    // Find and update the document, returning the new version and enforcing schema validation.
    let updatedProgram = await Program.findByIdAndUpdate(
      programId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProgram) {
      return res
        .status(404)
        .json({ message: "Program not found", success: false });
    }

    // Re-populate relations for the client response.
    updatedProgram = await Program.findById(updatedProgram._id)
      .populate("company", "name")
      .populate("template", "title version")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      data: updatedProgram,
      message: "Program updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[updateProgram] Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: "A program with this name might already exist.",
        error: error.message,
        success: false,
      });
    }
    res.status(400).json({
      message: "Error updating program",
      error: error.message,
      success: false,
    });
  }
};

/**
 * Permanently deletes a program from the database using its ID.
 * Note: This is a hard delete. Consider soft-deletes for data retention in production.
 * @route DELETE /api/programs/:id
 */
export const deleteProgram = async (req, res) => {
  try {
    const deletedProgram = await Program.findByIdAndDelete(req.params.id);

    if (!deletedProgram) {
      return res
        .status(404)
        .json({ message: "Program not found", success: false });
    }

    res.status(200).json({
      message: "Program deleted successfully",
      success: true,
      data: deletedProgram,
    });
  } catch (error) {
    console.error("[deleteProgram] Error:", error);
    res.status(500).json({
      message: "Error deleting program",
      error: error.message,
      success: false,
    });
  }
};
