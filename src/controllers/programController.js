// src/controllers/programController.js

import Program from "../models/Program.js";
import { createdBy, updatedBy } from "../utils/helper.js";

export const getAllPrograms = async (req, res) => {
  try {
    const programs = await Program.find()
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
    res
      .status(200)
      .json({ programs, message: "Programs retrieved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getProgramById = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }
    res
      .status(200)
      .json({ program, message: "Program retrieved successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createProgram = async (req, res) => {
  try {
    const { name, description, startDate, endDate, programStatus } = req.body;
    console.log(req.body);
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const newProgram = new Program({
      name,
      description,
      startDate,
      endDate,
      programStatus,
      ...createdBy(req),
    });

    const savedProgram = await newProgram.save();
    res
      .status(201)
      .json({ savedProgram, message: "Program created successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating program", error: error.message });
  }
};

export const updateProgram = async (req, res) => {
  try {
    const { name, description, startDate, endDate, status } = req.body;
    const programId = req.params.id;

    const updatedProgram = await Program.findByIdAndUpdate(
      programId,
      { name, description, startDate, endDate, status, ...updatedBy(req) },
      { new: true, runValidators: true }
    );

    if (!updatedProgram) {
      return res.status(404).json({ message: "Program not found" });
    }

    res
      .status(200)
      .json({ updatedProgram, message: "Program updated successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating program", error: error.message });
  }
};

export const deleteProgram = async (req, res) => {
  try {
    const deletedProgram = await Program.findByIdAndDelete(req.params.id);
    if (!deletedProgram) {
      return res.status(404).json({ message: "Program not found" });
    }
    res.status(200).json({ message: "Program deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting program", error: error.message });
  }
};
