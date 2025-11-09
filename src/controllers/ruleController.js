// src/controllers/ruleController.js

import Rule from "../models/Rule.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// GET /api/rules - With filtering, sorting, population
export const getAllRules = async (req, res) => {
  try {
    // Step 1: Get filter values (✅ category changed to checkType)
    const { search, status, checkType, ruleCode } = req.query;
    console.log("[getAllRules] req.query:", req.query);

    // Step 2: Create dynamic Mongoose query object
    const query = {};

    // Step 3: Add status & checkType filters
    if (status === "active" || status === "inactive") {
      query.status = status;
    }
    if (checkType) {
      // ✅ Filter by checkType ID
      query.checkType = checkType;
    }
    if (ruleCode) {
      // ✅ Filter by ruleCode
      query.ruleCode = { $regex: ruleCode, $options: "i" };
    }

    // Step 4: Add search filter (name, description, ruleCode)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { ruleCode: searchRegex }, // ✅ Search ruleCode
        // Cannot search populated checkType.name without aggregation
      ];
    }

    console.log("[getAllRules] Final Mongoose Query:", JSON.stringify(query));

    // Step 5: Find data, populate new fields
    const rules = await Rule.find(query)
      .populate("checkType", "name") // ✅ Populate checkType
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
      .populate("checkType", "name") // ✅ Populate checkType
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

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
    // ✅ category changed to checkType, ruleCode added
    const { name, description, ruleCode, checkType } = req.body;

    // Validation
    if (!name || !ruleCode || !checkType) {
      return res
        .status(400)
        .json({
          message: "Name, Rule Code, and Check Type are required",
          success: false,
        });
    }

    const newRule = new Rule({
      name,
      description,
      ruleCode, // ✅ Added
      checkType, // ✅ Added
      ...createdBy(req),
    });
    let savedRule = await newRule.save();

    // Populate after saving
    savedRule = await Rule.findById(savedRule._id)
      .populate("checkType", "name")
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
      // Handle duplicate ruleCode error
      return res
        .status(400)
        .json({
          message: "Rule Code already exists.",
          error: error.message,
          success: false,
        });
    }
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res
      .status(400)
      .json({
        message: "Error creating rule",
        error: error.message,
        success: false,
      });
  }
};

// PUT /api/rules/:id - Update population and response format
export const updateRule = async (req, res) => {
  try {
    // ✅ category changed to checkType, ruleCode added
    const { name, description, ruleCode, checkType, status } = req.body;
    const ruleId = req.params.id;

    // Validation
    if (!name || !ruleCode || !checkType) {
      return res
        .status(400)
        .json({
          message: "Name, Rule Code, and Check Type are required",
          success: false,
        });
    }

    const updateData = {
      name,
      description,
      ruleCode, // ✅ Added
      checkType, // ✅ Added
      status, // ✅ Status update
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
      .populate("checkType", "name")
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
      // Handle duplicate ruleCode error
      return res
        .status(400)
        .json({
          message: "Rule Code already exists.",
          error: error.message,
          success: false,
        });
    }
    if (error.name === "ValidationError")
      return res
        .status(400)
        .json({ message: error.message, error: error.errors, success: false });
    res
      .status(400)
      .json({
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

    // TODO: Check if this rule is used in any Question and prevent deletion? (Future)

    // Standard response format
    res.status(200).json({
      message: "Rule deleted successfully",
      success: true,
      data: deletedRule,
    });
  } catch (error) {
    console.error("[deleteRule] Error:", error);
    res
      .status(500)
      .json({
        message: "Error deleting rule",
        error: error.message,
        success: false,
      });
  }
};
