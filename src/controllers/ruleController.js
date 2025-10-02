// src/controllers/ruleController.js


import Rule from "../models/Rule.js";
import { createdBy, updatedBy } from "../utils/helper.js";

export const getAllRules = async (req, res) => {
  try {
    const rules = await Rule.find().populate("createdBy", "name email");
    res.status(200).json({ rules });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getRuleById = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );
    if (!rule) {
      return res.status(404).json({ message: "Rule not found" });
    }
    res.status(200).json({ rule });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createRule = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const newRule = new Rule({ name, description, ...createdBy(req) });
    const savedRule = await newRule.save();

    res.status(201).json({ savedRule, message: "Rule created successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating rule", error: error.message });
  }
};

export const updateRule = async (req, res) => {
  try {
    const { name, description } = req.body;
    const ruleId = req.params.id;

    const updatedRule = await Rule.findByIdAndUpdate(
      ruleId,
      { name, description, ...updatedBy(req) },
      { new: true, runValidators: true }
    );

    if (!updatedRule) {
      return res.status(404).json({ message: "Rule not found" });
    }

    res.status(200).json({ updatedRule, message: "Rule updated successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating rule", error: error.message });
  }
};

export const deleteRule = async (req, res) => {
  try {
    const deletedRule = await Rule.findByIdAndDelete(req.params.id);
    if (!deletedRule) {
      return res.status(404).json({ message: "Rule not found" });
    }
    res.status(200).json({ message: "Rule deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting rule", error: error.message });
  }
};
