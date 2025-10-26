// src/controllers/teamController.js

import Team from "../models/Team.js";
import { createdBy, updatedBy } from "../utils/helper.js"; // Ensure updatedBy is imported

// GET /api/teams - With filtering, sorting, population based on new schema
export const getAllTeams = async (req, res) => {
  try {
    // Step 1: Get filter values
    const { search, auditSession, user, roleInTeam, status } = req.query;
    console.log("[getAllTeams] req.query:", req.query);

    // Step 2: Create query object
    const query = {};

    // Step 3: Add filters
    if (auditSession) query.auditSession = auditSession;
    if (user) query.user = user;
    if (roleInTeam) query.roleInTeam = roleInTeam; // Filter by specific role (enum value)
    if (status === "active" || status === "inactive") query.status = status;

    // Step 4: Add search filter (searches roleInTeam if not specifically filtered)
    // More complex search (e.g., on populated user name) would require aggregation
    if (search && !roleInTeam) {
      const searchRegex = { $regex: search, $options: "i" };
      query.roleInTeam = searchRegex; // Simple search on role text
    }

    console.log("[getAllTeams] Final Mongoose Query:", JSON.stringify(query));

    // Step 5: Find data, populate relationships, and sort
    const teams = await Team.find(query)
      .populate("auditSession", "title status") // Populate session title/status
      .populate("user", "name email role") // Populate user name/email/role
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 });

    // Step 6: Count total matching documents
    const count = await Team.countDocuments(query);

    // Use standard response format
    res.status(200).json({
      data: teams,
      count: count,
      message: "Team assignments fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllTeams] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/teams/:id - Update population and response format
export const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("auditSession", "title status")
      .populate("user", "name email role")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!team)
      return res
        .status(404)
        .json({ message: "Team assignment not found", success: false });

    res
      .status(200)
      .json({
        data: team,
        message: "Team assignment fetched successfully",
        success: true,
      });
  } catch (error) {
    console.error("[getTeamById] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/teams - Update population, response format, error handling for index
export const createTeam = async (req, res) => {
  try {
    const { auditSession, user, roleInTeam } = req.body;

    // Validation
    if (!auditSession || !user || !roleInTeam) {
      return res
        .status(400)
        .json({
          message: "Audit session, user, and role in team are required",
          success: false,
        });
    }
    // Optional: Validate roleInTeam against enum values here if needed, though Mongoose will do it

    const newTeam = new Team({
      auditSession,
      user,
      roleInTeam,
      ...createdBy(req),
      // status defaults to 'active'
    });

    let savedTeam = await newTeam.save(); // Mongoose will validate enum and unique index here

    // Repopulate for response
    savedTeam = await Team.findById(savedTeam._id)
      .populate("auditSession", "title status")
      .populate("user", "name email role")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res
      .status(201)
      .json({
        data: savedTeam,
        message: "Team assignment created successfully",
        success: true,
      });
  } catch (error) {
    console.error("[createTeam] Error:", error);
    // Handle Unique Index Violation (auditSession + user)
    if (error.code === 11000) {
      return res.status(400).json({
        message: "This user is already assigned to this audit session.",
        error: error.message,
        success: false,
      });
    }
    // Handle Mongoose Validation Errors (e.g., invalid enum value for roleInTeam)
    if (error.name === "ValidationError") {
      // Extract specific validation messages if possible
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
        message: "Error creating team assignment",
        error: error.message,
        success: false,
      });
  }
};

// PUT /api/teams/:id - Update population, response format, error handling for index
export const updateTeam = async (req, res) => {
  try {
    const { auditSession, user, roleInTeam, status } = req.body; // Allow updating status
    const teamId = req.params.id;

    // Validation
    if (!auditSession || !user || !roleInTeam) {
      return res
        .status(400)
        .json({
          message: "Audit session, user, and role in team are required",
          success: false,
        });
    }
    // Optional: Validate roleInTeam against enum values

    const updateData = {
      auditSession,
      user,
      roleInTeam,
      ...updatedBy(req),
    };
    if (status === "active" || status === "inactive")
      updateData.status = status;

    let updatedTeam = await Team.findByIdAndUpdate(
      teamId,
      updateData,
      { new: true, runValidators: true } // runValidators ensures enum check
    );

    if (!updatedTeam)
      return res
        .status(404)
        .json({ message: "Team assignment not found", success: false });

    // Repopulate for response
    updatedTeam = await Team.findById(updatedTeam._id)
      .populate("auditSession", "title status")
      .populate("user", "name email role")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res
      .status(200)
      .json({
        data: updatedTeam,
        message: "Team assignment updated successfully",
        success: true,
      });
  } catch (error) {
    console.error("[updateTeam] Error:", error);
    // Handle potential unique index conflict on update
    if (error.code === 11000) {
      return res.status(400).json({
        message: "This user might already be assigned to this audit session.",
        error: error.message,
        success: false,
      });
    }
    // Handle Mongoose Validation Errors
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
        message: "Error updating team assignment",
        error: error.message,
        success: false,
      });
  }
};

// DELETE /api/teams/:id - Update response format
export const deleteTeam = async (req, res) => {
  try {
    const deletedTeam = await Team.findByIdAndDelete(req.params.id);
    if (!deletedTeam)
      return res
        .status(404)
        .json({ message: "Team assignment not found", success: false });
    res
      .status(200)
      .json({
        message: "Team assignment deleted successfully",
        success: true,
        data: deletedTeam,
      });
  } catch (error) {
    console.error("[deleteTeam] Error:", error);
    res
      .status(500)
      .json({
        message: "Error deleting team assignment",
        error: error.message,
        success: false,
      });
  }
};
