// src/controllers/templateController.js

import Template from "../models/Template.js";
import { createdBy, updatedBy } from "../utils/helper.js"; // Ensure updatedBy is imported

// GET /api/templates - With filtering, sorting, population
export const getAllTemplates = async (req, res) => {
  try {
    // Step 1: Get filter values (✅ checkType ADDED)
    const { search, company, status, checkType } = req.query;
    console.log("[getAllTemplates] req.query:", req.query);

    // Step 2: Create dynamic Mongoose query object
    const query = {};

    // Step 3: Add status and company filters
    if (status === "active" || status === "inactive") {
      query.status = status; // From commonFields
    }
    if (company) {
      query.company = company; // Company _id from frontend
    }
    if (checkType) {
      // ✅ ADDED filter by checkType
      query.checkType = checkType;
    }

    // Step 4: Add search filter (searches in 'title' and 'description')
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    console.log(
      "[getAllTemplates] Final Mongoose Query:",
      JSON.stringify(query)
    );

    // Step 5: Find data, populate relationships, and sort
    const templates = await Template.find(query)
      .populate("company", "name")
      .populate("checkType", "name") // ✅ ADDED checkType population
      // .populate("questions") // ❌ DANGER: Do not populate full questions array in list view. Too much data.
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 });

    // Step 6: Count total matching documents
    const count = await Template.countDocuments(query);

    // Use standard response format
    res.status(200).json({
      data: templates,
      count: count,
      message: "Templates fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllTemplates] Error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

// GET /api/templates/:id - Update population and response format
export const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate("company", "name")
      .populate("checkType", "name") // ✅ ADDED checkType population
      .populate({
        // ✅ ADDED: Populate questions array fully for detail view
        path: "questions",
        populate: [
          // Deep populate inside questions
          { path: "rule", select: "name ruleCode" },
          { path: "checkType", select: "name" },
        ],
      })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!template) {
      return res
        .status(404)
        .json({ message: "Template not found", success: false });
    }

    // Standard response format
    res.status(200).json({
      data: template,
      message: "Template fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getTemplateById] Error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

// POST /api/templates - Update population and response format
export const createTemplate = async (req, res) => {
  try {
    // ✅ checkType and questions (array) ADDED
    const { title, description, version, company, checkType, questions } =
      req.body;

    // Validation
    if (!title || !company || !checkType) {
      return res
        .status(400)
        .json({
          message: "Title, Company, and Check Type are required",
          success: false,
        });
    }

    const newTemplate = new Template({
      title,
      description,
      version,
      company,
      checkType, // ✅ ADDED
      questions: questions || [], // ✅ ADDED (default to empty array)
      ...createdBy(req),
    });
    let savedTemplate = await newTemplate.save();

    // Populate after saving for accurate response
    savedTemplate = await Template.findById(savedTemplate._id)
      .populate("company", "name")
      .populate("checkType", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");
    // We don't populate 'questions' here, it's too heavy for a create response

    // Standard response format
    res.status(201).json({
      data: savedTemplate,
      message: "Template created successfully",
      success: true,
    });
  } catch (error) {
    console.error("[createTemplate] Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "A template with this title or configuration might already exist.",
        error: error.message,
        success: false,
      });
    }
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error creating template",
      error: error.message,
      success: false,
    });
  }
};

// PUT /api/templates/:id - Update population and response format
export const updateTemplate = async (req, res) => {
  try {
    // ✅ checkType and questions (array) ADDED
    const {
      title,
      description,
      version,
      company,
      checkType,
      questions,
      status,
    } = req.body;
    const templateId = req.params.id;

    // Validation
    if (!title || !company || !checkType) {
      return res
        .status(400)
        .json({
          message: "Title, Company, and Check Type are required",
          success: false,
        });
    }

    const updateData = {
      title,
      description,
      version,
      company,
      checkType, // ✅ ADDED
      questions: questions || [], // ✅ ADDED
      status, // ✅ ADDED status
      ...updatedBy(req),
    };

    let updatedTemplate = await Template.findByIdAndUpdate(
      templateId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTemplate) {
      return res
        .status(404)
        .json({ message: "Template not found", success: false });
    }

    // Populate after update
    updatedTemplate = await Template.findById(updatedTemplate._id)
      .populate("company", "name")
      .populate("checkType", "name")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    // Standard response format
    res.status(200).json({
      data: updatedTemplate,
      message: "Template updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[updateTemplate] Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message:
          "A template with this title or configuration might already exist.",
        error: error.message,
        success: false,
      });
    }
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error updating template",
      error: error.message,
      success: false,
    });
  }
};

// DELETE /api/templates/:id - Update response format
export const deleteTemplate = async (req, res) => {
  try {
    const deletedTemplate = await Template.findByIdAndDelete(req.params.id);

    if (!deletedTemplate) {
      return res
        .status(404)
        .json({ message: "Template not found", success: false });
    }

    // TODO: Check if this Template is used in any Program and prevent deletion? (Future)

    // Standard response format
    res.status(200).json({
      message: "Template deleted successfully",
      success: true,
      data: deletedTemplate, // Optional
    });
  } catch (error) {
    console.error("[deleteTemplate] Error:", error);
    res.status(500).json({
      message: "Error deleting template",
      error: error.message,
      success: false,
    });
  }
};
