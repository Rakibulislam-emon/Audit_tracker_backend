// src/controllers/ruleController.js

import Rule from "../models/Rule.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// GET /api/rules - With filtering, sorting, population
export const getAllRules = async (req, res) => {
  try {
    // Step 1: Get filter values from req.query
    // ✅ 'category' ebong 'ruleCode' filter add kora hoyeche
    const { search, status, category, ruleCode } = req.query;
    console.log("[getAllRules] req.query:", req.query);

    // Step 2: Create dynamic Mongoose query object
    const query = {};

    // Step 3: Add status & category filters
    if (status === "active" || status === "inactive") {
      query.status = status;
    }
    if (category) {
      query.category = { $regex: category, $options: "i" };
    }
    if (ruleCode) {
      query.ruleCode = { $regex: ruleCode, $options: "i" };
    }

    // Step 4: Add search filter (searches in name, description, ruleCode, category)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { ruleCode: searchRegex }, // ✅ Notun field add
        { category: searchRegex }, // ✅ Notun field add
      ];
    }

    console.log("[getAllRules] Final Mongoose Query:", JSON.stringify(query));

    // Step 5: Find data, populate, and sort
    const rules = await Rule.find(query)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 });

    // Step 6: Count total matching documents
    const count = await Rule.countDocuments(query);

    // Use standard response format
    res.status(200).json({
      data: rules,
      count: count,
      message: "Rules fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllRules] Error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

// GET /api/rules/:id - Update population and response format
export const getRuleById = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email"); // Populate updater

    if (!rule) {
      return res
        .status(404)
        .json({ message: "Rule not found", success: false });
    }

    // Standard response format
    res.status(200).json({
      data: rule,
      message: "Rule fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getRuleById] Error:", error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

// POST /api/rules - Update population and response format
export const createRule = async (req, res) => {
  try {
    // ✅ Notun field add
    const { name, description, ruleCode, category } = req.body;

    // Validation
    if (!name || !ruleCode || !category) {
      return res.status(400).json({
        message: "Name, Rule Code, and Category are required",
        success: false,
      });
    }

    const newRule = new Rule({
      name,
      description,
      ruleCode, // ✅ Notun field
      category, // ✅ Notun field
      ...createdBy(req),
    });
    let savedRule = await newRule.save();

    // Populate after saving
    savedRule = await Rule.findById(savedRule._id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    // Standard response format
    res.status(201).json({
      data: savedRule,
      message: "Rule created successfully",
      success: true,
    });
  } catch (error) {
    console.error("[createRule] Error:", error);
    if (error.code === 11000) {
      // Handle potential duplicate ruleCode error
      return res.status(400).json({
        message: "Rule Code already exists.",
        error: error.message,
        success: false,
      });
    }
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error creating rule",
      error: error.message,
      success: false,
    });
  }
};

// PUT /api/rules/:id - Update population and response format
export const updateRule = async (req, res) => {
  try {
    // ✅ Notun field add
    const { name, description, ruleCode, category, status } = req.body;
    const ruleId = req.params.id;

    // Validation
    if (!name || !ruleCode || !category) {
      return res.status(400).json({
        message: "Name, Rule Code, and Category are required",
        success: false,
      });
    }

    const updateData = {
      name,
      description,
      ruleCode, // ✅ Notun field
      category, // ✅ Notun field
      status, // ✅ Status update add
      ...updatedBy(req),
    };

    let updatedRule = await Rule.findByIdAndUpdate(ruleId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedRule) {
      return res
        .status(404)
        .json({ message: "Rule not found", success: false });
    }

    // Populate after update
    updatedRule = await Rule.findById(updatedRule._id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    // Standard response format
    res.status(200).json({
      data: updatedRule,
      message: "Rule updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[updateRule] Error:", error);
    if (error.code === 11000) {
      // Handle potential duplicate ruleCode error
      return res.status(400).json({
        message: "Rule Code already exists.",
        error: error.message,
        success: false,
      });
    }
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res.status(400).json({
      message: "Error updating rule",
      error: error.message,
      success: false,
    });
  }
};

// DELETE /api/rules/:id - Update response format
export const deleteRule = async (req, res) => {
  try {
    const deletedRule = await Rule.findByIdAndDelete(req.params.id);
    if (!deletedRule) {
      return res
        .status(404)
        .json({ message: "Rule not found", success: false });
    }
    // TODO: Check if this rule is used in any Question? (Future enhancement)

    // Standard response format
    res.status(200).json({
      message: "Rule deleted successfully",
      success: true,
      data: deletedRule, // Optional
    });
  } catch (error) {
    console.error("[deleteRule] Error:", error);
    res.status(500).json({
      message: "Error deleting rule",
      error: error.message,
      success: false,
    });
  }
};
