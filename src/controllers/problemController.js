import Problem from "../models/Problem.js";
import { createdBy, updatedBy } from "../utils/helper.js";

export const getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find()
      .populate("auditSession", "title")
      .populate("question", "questionText")
      .populate("createdBy", "name email");
    
    res.status(200).json({
      problems,
      message: "Problems retrieved successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id)
      .populate("auditSession", "title")
      .populate("question", "questionText")
      .populate("createdBy", "name email");
    
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    
    res.status(200).json({
      problem,
      message: "Problem retrieved successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createProblem = async (req, res) => {
  try {
    const { 
      auditSession, 
      question, 
      title, 
      description, 
      impact, 
      likelihood, 
      riskRating, 
      status, 
      methodology 
    } = req.body;
    // check the fields in db so it not duplicate
    const existingProblem = await Problem.findOne({ auditSession, title });
    if (existingProblem) {
      return res.status(400).json({
        message: "Problem with the same audit session and title already exists"
      });
    }

    if (!auditSession || !title) {
      return res.status(400).json({
        message: "Audit session and title are required"
      });
    }

    const newProblem = new Problem({
      auditSession,
      question,
      title,
      description,
      impact,
      likelihood,
      riskRating,
      status,
      methodology,
      ...createdBy(req)
    });

    const savedProblem = await newProblem.save();
    
    res.status(201).json({
      savedProblem,
      message: "Problem created successfully"
    });
  } catch (error) {
    res.status(400).json({ message: "Error creating problem" });
  }
};

export const updateProblem = async (req, res) => {
  try {
    const { 
      auditSession, 
      question, 
      title, 
      description, 
      impact, 
      likelihood, 
      riskRating, 
      status, 
      methodology 
    } = req.body;
    
    const problemId = req.params.id;

    const updatedProblem = await Problem.findByIdAndUpdate(
      problemId,
      {
        auditSession,
        question,
        title,
        description,
        impact,
        likelihood,
        riskRating,
        status,
        methodology,
        ...updatedBy(req)
      },
      { new: true, runValidators: true }
    );

    if (!updatedProblem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.status(200).json({
      updatedProblem,
      message: "Problem updated successfully"
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating problem" });
  }
};

export const deleteProblem = async (req, res) => {
  try {
    const deletedProblem = await Problem.findByIdAndDelete(req.params.id);
    if (!deletedProblem) {
      return res.status(404).json({ message: "Problem not found" });
    }
    res.status(200).json({ message: "Problem deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting problem" });
  }
};