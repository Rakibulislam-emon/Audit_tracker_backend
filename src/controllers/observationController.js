// src/controllers/observationController.js

import Observation from "../models/Observation.js";
import { createdBy, updatedBy } from "../utils/helper.js"; // Ensure updatedBy is imported

// GET /api/observations - With filtering, sorting, population
export const getAllObservations = async (req, res) => {
  try {
    // Step 1: Get filter values
    const {
      search,
      auditSession,
      question,
      status,
      resolutionStatus,
      severity,
    } = req.query;
    console.log("[getAllObservations] req.query:", req.query);

    // Step 2: Create query object
    const query = {};

    // Step 3: Add filters
    if (auditSession) query.auditSession = auditSession;
    if (question) query.question = question; // Filter by specific question
    if (status === "active" || status === "inactive") query.status = status; // System status
    if (
      resolutionStatus &&
      [
        "Open",
        "In Progress",
        "Resolved",
        "Closed - Verified",
        "Closed - Risk Accepted",
      ].includes(resolutionStatus)
    ) {
      query.resolutionStatus = resolutionStatus; // Resolution status
    }
    if (
      severity &&
      ["Informational", "Low", "Medium", "High", "Critical"].includes(severity)
    ) {
      query.severity = severity; // Filter by severity
    }

    // Step 4: Add search filter (searches questionText and response)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ questionText: searchRegex }, { response: searchRegex }];
    }

    console.log(
      "[getAllObservations] Final Mongoose Query:",
      JSON.stringify(query)
    );

    // Step 5: Find data, populate relationships, and sort
    const observations = await Observation.find(query)
      .populate("auditSession", "title") // Populate session title
      .populate("question", "questionText responseType") // Populate original question text/type
      .populate("problem", "problemId title") // Populate linked problem ID/title (if exists)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 }); // Sort by creation date

    // Step 6: Count total matching documents
    const count = await Observation.countDocuments(query);

    // Use standard response format
    res.status(200).json({
      data: observations,
      count: count,
      message: "Observations fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllObservations] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/observations/:id - Update population
export const getObservationById = async (req, res) => {
  try {
    const observation = await Observation.findById(req.params.id)
      .populate("auditSession", "title")
      .populate("question", "questionText responseType")
      .populate("problem", "problemId title")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!observation)
      return res
        .status(404)
        .json({ message: "Observation not found", success: false });

    res.status(200).json({
      data: observation,
      message: "Observation fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getObservationById] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/observations - Handle new fields, updated error handling
export const createObservation = async (req, res) => {
  try {
    // Include new fields from schema
    const {
      auditSession,
      question,
      questionText,
      response,
      severity,
      resolutionStatus,
      problem,
    } = req.body;

    // Validation
    if (!auditSession || !questionText) {
      // question is optional, questionText is required
      return res.status(400).json({
        message:
          "Audit Session and Observation details (question text) are required",
        success: false,
      });
    }

    const newObservation = new Observation({
      auditSession,
      question: question || null, // Handle optional question ref
      questionText,
      response,
      severity, // Optional
      resolutionStatus: resolutionStatus || "Open", // Use provided or default
      problem: problem || null, // Handle optional problem link
      ...createdBy(req),
      // status defaults to 'active'
    });

    let savedObservation = await newObservation.save(); // Mongoose validates enums etc.

    // Repopulate for response
    savedObservation = await Observation.findById(savedObservation._id)
      .populate("auditSession", "title")
      .populate("question", "questionText responseType")
      .populate("problem", "problemId title")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(201).json({
      data: savedObservation,
      message: "Observation created successfully",
      success: true,
    });
  } catch (error) {
    console.error("[createObservation] Error:", error);
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
      message: "Error creating observation",
      error: error.message,
      success: false,
    });
  }
};

// PUT /api/observations/:id - Handle new fields, updated error handling
export const updateObservation = async (req, res) => {
  try {
    // Include all updatable fields
    const {
      auditSession,
      question,
      questionText,
      response,
      severity,
      status,
      resolutionStatus,
      problem,
    } = req.body;
    const observationId = req.params.id;

    // Basic Validation
    if (!auditSession || !questionText) {
      // Assuming these cannot be removed/emptied
      return res.status(400).json({
        message:
          "Audit Session and Observation details (question text) cannot be empty",
        success: false,
      });
    }

    // Build update object dynamically
    const updateData = { ...updatedBy(req) };
    // Required fields (cannot be unset easily via PUT/PATCH unless specifically handled)
    updateData.auditSession = auditSession;
    updateData.questionText = questionText;
    // Optional/Updatable fields
    if (question !== undefined) updateData.question = question || null;
    if (response !== undefined) updateData.response = response;
    if (severity !== undefined) updateData.severity = severity || null; // Allow clearing severity
    if (status === "active" || status === "inactive")
      updateData.status = status;
    if (resolutionStatus) updateData.resolutionStatus = resolutionStatus; // Update resolution status
    if (problem !== undefined) updateData.problem = problem || null; // Allow linking/unlinking problem

    let updatedObservation = await Observation.findByIdAndUpdate(
      observationId,
      updateData,
      { new: true, runValidators: true } // runValidators ensures enum checks
    );

    if (!updatedObservation)
      return res
        .status(404)
        .json({ message: "Observation not found", success: false });

    // Repopulate for response
    updatedObservation = await Observation.findById(updatedObservation._id)
      .populate("auditSession", "title")
      .populate("question", "questionText responseType")
      .populate("problem", "problemId title")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res.status(200).json({
      data: updatedObservation,
      message: "Observation updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[updateObservation] Error:", error);
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
      message: "Error updating observation",
      error: error.message,
      success: false,
    });
  }
};

// DELETE /api/observations/:id - Standard response
export const deleteObservation = async (req, res) => {
  try {
    const deletedObservation = await Observation.findByIdAndDelete(
      req.params.id
    );
    if (!deletedObservation)
      return res
        .status(404)
        .json({ message: "Observation not found", success: false });
    res.status(200).json({
      message: "Observation deleted successfully",
      success: true,
      data: deletedObservation,
    });
  } catch (error) {
    console.error("[deleteObservation] Error:", error);
    res.status(500).json({
      message: "Error deleting observation",
      error: error.message,
      success: false,
    });
  }
};
