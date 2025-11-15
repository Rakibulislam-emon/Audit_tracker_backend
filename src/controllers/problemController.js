// src/controllers/problemController.js

import Problem from "../models/Problem.js";
import { createdBy, updatedBy } from "../utils/helper.js"; // Ensure updatedBy is imported

// GET /api/problems - With filtering, sorting, population based on new schema
export const getAllProblems = async (req, res) => {
  try {
    // Step 1: Get filter values
    const {
      search,
      auditSession,
      observation,
      question,
      status,
      problemStatus,
      impact,
      likelihood,
      riskRating,
    } = req.query;
    console.log("[getAllProblems] req.query:", req.query);

    // Step 2: Create query object
    const query = {};

    // Step 3: Add filters
    if (auditSession) query.auditSession = auditSession;
    if (observation) query.observation = observation; // Filter by originating observation
    if (question) query.question = question;
    if (status === "active" || status === "inactive") query.status = status; // System status
    if (
      problemStatus &&
      ["Open", "In Progress", "Resolved", "Closed"].includes(problemStatus)
    ) {
      query.problemStatus = problemStatus; // Operational status
    }
    // Filters for impact, likelihood, riskRating
    if (impact && ["Low", "Medium", "High"].includes(impact))
      query.impact = impact;
    if (
      likelihood &&
      ["Rare", "Unlikely", "Possible", "Likely", "Almost Certain"].includes(
        likelihood
      )
    )
      query.likelihood = likelihood;
    if (
      riskRating &&
      ["Low", "Medium", "High", "Critical"].includes(riskRating)
    )
      query.riskRating = riskRating;

    // Step 4: Add search filter (searches title and description)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    console.log(
      "[getAllProblems] Final Mongoose Query:",
      JSON.stringify(query)
    );

    // Step 5: Find data, populate relationships, and sort
    const problems = await Problem.find(query)
      .populate("auditSession", "title") // Populate relevant session info
      .populate("observation", "_id severity response") // Populate linked observation's severity and response
      .populate("question", "questionText") // Populate linked question text
      .populate("fixActions", "_id title status") // Populate linked fix actions
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 }); // Sort by creation date

    // Step 6: Count total matching documents
    const count = await Problem.countDocuments(query);

    // Standard response format
    res.status(200).json({
      data: problems,
      count: count,
      message: "Problems fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllProblems] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/problems/:id - Update population
export const getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .populate("auditSession", "title")
      .populate("observation", "_id severity resolutionStatus response")
      .populate("question", "questionText")
      .populate("fixActions", "_id title status")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!problem)
      return res
        .status(404)
        .json({ message: "Problem not found", success: false });

    res
      .status(200)
      .json({
        data: problem,
        message: "Problem fetched successfully",
        success: true,
      });
  } catch (error) {
    console.error("[getProblemById] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/problems - Include new fields, updated error handling
export const createProblem = async (req, res) => {
  try {
    // Include new fields from schema
    const {
      auditSession,
      observation,
      question,
      title,
      description,
      impact,
      likelihood,
      riskRating,
      problemStatus,
      // methodology,
      fixActions,
    } = req.body;
 console.log("[createProblem] req.body:", req.body);
   
    // Validation (Required fields from schema)
    if (
      !auditSession ||
      !title ||
      !description ||
      !impact ||
      !likelihood ||
      !riskRating
    ) {
      return res
        .status(400)
        .json({
          message:
            "Audit Session, Title, Description, Impact, Likelihood, and Risk Rating are required",
          success: false,
        });
    }

    // Check for duplicates (manual check as no unique index)
    const existingProblem = await Problem.findOne({ auditSession, title });
    if (existingProblem) {
      return res
        .status(400)
        .json({
          message:
            "Problem with the same audit session and title already exists",
          success: false,
        });
    }

    const newProblem = new Problem({
      auditSession,
      observation: observation || null,
      question: question || null,
      title,
      description,
      impact,
      likelihood,
      riskRating,
      problemStatus: problemStatus || "Open", // Use provided or default
      // methodology,
      fixActions: fixActions || [], // Default to empty array
      ...createdBy(req),
      // status defaults to 'active'
    });

    let savedProblem = await newProblem.save(); // Mongoose validates enums etc.

    // Repopulate for response
    savedProblem = await Problem.findById(savedProblem._id)
      .populate("auditSession", "title")
      .populate("observation", "_id severity resolutionStatus response")
      .populate("question", "questionText")
      .populate("fixActions", "_id title status")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res
      .status(201)
      .json({
        data: savedProblem,
        message: "Problem created successfully",
        success: true,
      });
  } catch (error) {
    console.error("[createProblem] Error:", error);
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
        message: "Error creating problem",
        error: error.message,
        success: false,
      });
  }
};

// PATCH /api/problems/:id - Include new fields, updated error handling
export const updateProblem = async (req, res) => {
  try {
    // Include all updatable fields from schema
    const {
      auditSession,
      observation,
      question,
      title,
      description,
      impact,
      likelihood,
      riskRating,
      status,
      problemStatus,
      // methodology,
      fixActions,
    } = req.body;
    const problemId = req.params.id;

    // Validation
    if (
      !auditSession ||
      !title ||
      !description ||
      !impact ||
      !likelihood ||
      !riskRating
    ) {
      return res
        .status(400)
        .json({
          message:
            "Audit Session, Title, Description, Impact, Likelihood, and Risk Rating cannot be empty",
          success: false,
        });
    }

    // Build update object dynamically
    const updateData = { ...updatedBy(req) };
    // Required fields
    updateData.auditSession = auditSession;
    updateData.title = title;
    updateData.description = description;
    updateData.impact = impact;
    updateData.likelihood = likelihood;
    updateData.riskRating = riskRating;
    // Optional/Updatable fields
    if (observation !== undefined) updateData.observation = observation || null;
    if (question !== undefined) updateData.question = question || null;
    if (problemStatus) updateData.problemStatus = problemStatus;
    // // // if (methodology !== undefined) updateData.methodology = methodology;
    if (fixActions !== undefined) updateData.fixActions = fixActions || []; // Allow updating fix actions
    if (status === "active" || status === "inactive")
      updateData.status = status;

    let updatedProblem = await Problem.findByIdAndUpdate(
      problemId,
      updateData,
      { new: true, runValidators: true } // runValidators ensures enum checks
    );

    if (!updatedProblem)
      return res
        .status(404)
        .json({ message: "Problem not found", success: false });

    // Repopulate for response
    updatedProblem = await Problem.findById(updatedProblem._id)
      .populate("auditSession", "title")
      .populate("observation", "_id severity resolutionStatus response")
      .populate("question", "questionText")
      .populate("fixActions", "_id title status") // Populate linked fix actions
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res
      .status(200)
      .json({
        data: updatedProblem,
        message: "Problem updated successfully",
        success: true,
      });
  } catch (error) {
    console.error("[updateProblem] Error:", error);
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
    // Handle potential duplicate error if you re-introduce the manual check for title+session
    res
      .status(400)
      .json({
        message: "Error updating problem",
        error: error.message,
        success: false,
      });
  }
};

// DELETE /api/problems/:id - Standard response
export const deleteProblem = async (req, res) => {
  try {
    const deletedProblem = await Problem.findByIdAndDelete(req.params.id);
    if (!deletedProblem)
      return res
        .status(404)
        .json({ message: "Problem not found", success: false });
    res
      .status(200)
      .json({
        message: "Problem deleted successfully",
        success: true,
        data: deletedProblem,
      });
  } catch (error) {
    console.error("[deleteProblem] Error:", error);
    res
      .status(500)
      .json({
        message: "Error deleting problem",
        error: error.message,
        success: false,
      });
  }
};
