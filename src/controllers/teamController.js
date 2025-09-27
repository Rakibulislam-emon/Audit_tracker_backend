import Team from "../models/Team.js";
import { createdBy, updatedBy } from "../utils/helper.js";

export const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find()
      .populate("auditSession", "title")
      .populate("user", "name email")
      .populate("createdBy", "name email");
    res.status(200).json({
      teams,
      message: "Teams retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate("auditSession", "title")
      .populate("user", "name email")
      .populate("createdBy", "name email");
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.status(200).json({
      team,
      message: "Team retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createTeam = async (req, res) => {
  try {
    const { auditSession, user, roleInTeam } = req.body;

    if (!auditSession || !user || !roleInTeam) {
      return res.status(400).json({
        message: "Audit session, user, and role are required",
      });
    }

    const newTeam = new Team({
      auditSession,
      user,
      roleInTeam,
      ...createdBy(req),
    });

    const savedTeam = await newTeam.save();
    res.status(201).json({
      savedTeam,
      message: "Team created successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error creating team" });
  }
};

export const updateTeam = async (req, res) => {
  try {
    const { auditSession, user, roleInTeam } = req.body;
    const teamId = req.params.id;

    const updatedTeam = await Team.findByIdAndUpdate(
      teamId,
      {
        auditSession,
        user,
        roleInTeam,
        ...updatedBy(req),
      },
      { new: true, runValidators: true }
    );

    if (!updatedTeam) {
      return res.status(404).json({ message: "Team not found" });
    }

    res.status(200).json({
      updatedTeam,
      message: "Team updated successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating team" });
  }
};

export const deleteTeam = async (req, res) => {
  try {
    const deletedTeam = await Team.findByIdAndDelete(req.params.id);
    if (!deletedTeam) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.status(200).json({ message: "Team deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting team" });
  }
};
