import FixAction from "../models/FixAction.js";
import { createdBy, updatedBy } from "../utils/helper.js";

export const getAllFixActions = async (req, res) => {
  try {
    const fixActions = await FixAction.find()
      .populate("problem", "title")
      .populate("owner", "name email")
      .populate("verifiedBy", "name email")
      .populate("createdBy", "name email");
    
    res.status(200).json({
      fixActions,
      message: "Fix actions retrieved successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getFixActionById = async (req, res) => {
  try {
    const fixAction = await FixAction.findById(req.params.id)
      .populate("problem", "title")
      .populate("owner", "name email")
      .populate("verifiedBy", "name email")
      .populate("createdBy", "name email");
    
    if (!fixAction) {
      return res.status(404).json({ message: "Fix action not found" });
    }
    
    res.status(200).json({
      fixAction,
      message: "Fix action retrieved successfully"
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const createFixAction = async (req, res) => {
  try {
    const { 
      problem, 
      actionText, 
      owner, 
      deadline, 
      actionStatus, 
      reviewNotes, 
      verificationMethod 
    } = req.body;

    if (!problem || !actionText || !owner || !deadline) {
      return res.status(400).json({
        message: "Problem, action text, owner, and deadline are required"
      });
    }

    const newFixAction = new FixAction({
      problem,
      actionText,
      owner,
      deadline,
      actionStatus,
      reviewNotes,
      verificationMethod,
      ...createdBy(req)
    });

    const savedFixAction = await newFixAction.save();
    
    res.status(201).json({
      savedFixAction,
      message: "Fix action created successfully"
    });
  } catch (error) {
    res.status(400).json({ message: "Error creating fix action" });
  }
};

export const updateFixAction = async (req, res) => {
  try {
    const { 
      problem, 
      actionText, 
      owner, 
      deadline, 
      actionStatus, 
      reviewNotes, 
      verificationMethod,
      verifiedBy,
      verifiedAt,
      verificationResult
    } = req.body;
    
    const fixActionId = req.params.id;

    const updatedFixAction = await FixAction.findByIdAndUpdate(
      fixActionId,
      {
        problem,
        actionText,
        owner,
        deadline,
        actionStatus,
        reviewNotes,
        verificationMethod,
        verifiedBy,
        verifiedAt,
        verificationResult,
        ...updatedBy(req)
      },
      { new: true, runValidators: true }
    );

    if (!updatedFixAction) {
      return res.status(404).json({ message: "Fix action not found" });
    }

    res.status(200).json({
      updatedFixAction,
      message: "Fix action updated successfully"
    });
  } catch (error) {
    res.status(400).json({ message: "Error updating fix action" });
  }
};

export const deleteFixAction = async (req, res) => {
  try {
    const deletedFixAction = await FixAction.findByIdAndDelete(req.params.id);
    if (!deletedFixAction) {
      return res.status(404).json({ message: "Fix action not found" });
    }
    res.status(200).json({ message: "Fix action deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting fix action" });
  }
};