// src/controllers/templateController.js

import Template from "../models/Template.js";
import { createdBy } from "../utils/helper.js";

export const getAllTemplates = async (req, res) => {
  try {
    const templates = await Template.find()
      .populate("company", "name")
      .populate("createdBy", "name email");
    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id)
      .populate("company", "name")
      .populate("createdBy", "name email");
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createTemplate = async (req, res) => {
  try {
    const { title, description, version, company } = req.body;

    if (!title || !company) {
      return res
        .status(400)
        .json({ message: "Title and company are required" });
    }

    const newTemplate = new Template({
      title,
      description,
      version,
      company,
      ...createdBy(req),
    });
    const savedTemplate = await newTemplate.save();

    res.status(201).json(savedTemplate, { message: "Template created successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating template", error: error.message });
  }
};

export const updateTemplate = async (req, res) => {
  try {
    const { title, description, version, company } = req.body;
    const templateId = req.params.id;

    const updatedTemplate = await Template.findByIdAndUpdate(
      templateId,
      { title, description, version, company, ...updatedBy(req)},
      { new: true, runValidators: true }
    );

    if (!updatedTemplate) {
      return res.status(404).json({ message: "Template not found" });
    }

    res.status(200).json(updatedTemplate, { message: "Template updated successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating template", error: error.message });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const deletedTemplate = await Template.findByIdAndDelete(req.params.id);
    if (!deletedTemplate) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.status(200).json({ message: "Template deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting template", error: error.message });
  }
};
