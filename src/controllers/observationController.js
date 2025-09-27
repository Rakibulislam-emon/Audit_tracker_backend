import Observation from "../models/Observation.js";
import { createdBy, updatedBy } from "../utils/helper.js";

export const getAllObservations = async (req, res) => {
  try {
    const observations = await Observation.find()
      .populate("auditSession", "title")
      .populate("question", "questionText")
      .populate("createdBy", "name email");
    res.status(200).json({
      observations,
      message: "Observations retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getObservationById = async (req, res) => {
  try {
    const observation = await Observation.findById(req.params.id)
      .populate("auditSession", "title")
      .populate("question", "questionText")
      .populate("createdBy", "name email");
    if (!observation) {
      return res.status(404).json({ message: "Observation not found" });
    }
    res.status(200).json({
      observation,
      message: "Observation retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createObservation = async (req, res) => {
  try {
    const { auditSession, question, questionText, response, severity } =
      req.body;

    if (!auditSession) {
      return res.status(400).json({
        message: "Audit session is required",
      });
    }

    const newObservation = new Observation({
      auditSession,
      question,
      questionText,
      response,
      severity,
      ...createdBy(req),
    });

    const savedObservation = await newObservation.save();
    res
      .status(200)
      .json(savedObservation, {
        message: "Observation created successfully",
      });
  } catch (error) {
    res.status(400).json({ message: "Error creating observation" });
  }
};

export const updateObservation = async (req, res) => {
  try {
    const { auditSession, question, questionText, response, severity } =
      req.body;
    const observationId = req.params.id;

    const updatedObservation = await Observation.findByIdAndUpdate(
      observationId,
      {
        auditSession,
        question,
        questionText,
        response,
        severity,
        ...updatedBy(req),
      },
      { new: true, runValidators: true }
    );

    if (!updatedObservation) {
      return res.status(404).json({ message: "Observation not found" });
    }

    res.status(200).json({
      updatedObservation,
      message: "Observation updated successfully",
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating observation" });
  }
};

export const deleteObservation = async (req, res) => {
  try {
    const deletedObservation = await Observation.findByIdAndDelete(
      req.params.id
    );
    if (!deletedObservation) {
      return res.status(404).json({ message: "Observation not found" });
    }
    res.status(200).json({ message: "Observation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting observation" });
  }
};
