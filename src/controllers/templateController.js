// src/controllers/templateController.js

import Template from "../models/Template.js";
import { createdBy, updatedBy } from "../utils/helper.js"; // Ensure updatedBy is imported

// GET /api/templates - With filtering, sorting, population
export const getAllTemplates = async (req, res) => {
    try {
        // Step 1: Get filter values from req.query
        const { search, company, status } = req.query;
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

        // Step 4: Add search filter (searches in 'title' and 'description')
        if (search) {
            const searchRegex = { $regex: search, $options: "i" };
            query.$or = [
                { title: searchRegex },
                { description: searchRegex },
            ];
        }

        console.log("[getAllTemplates] Final Mongoose Query:", JSON.stringify(query));

        // Step 5: Find data, populate relationships, and sort
        const templates = await Template.find(query)
            .populate("company", "name") // Populate company name
            .populate("createdBy", "name email") // Populate creator
            .populate("updatedBy", "name email") // Populate updater
            .sort({ createdAt: -1 }); // Sort by creation date

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
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// GET /api/templates/:id - Update population and response format
export const getTemplateById = async (req, res) => {
    try {
        const template = await Template.findById(req.params.id)
            .populate("company", "name")
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email"); // Populate updater

        if (!template) {
            return res.status(404).json({ message: "Template not found", success: false });
        }

        // Standard response format
        res.status(200).json({
            data: template,
            message: "Template fetched successfully",
            success: true,
        });

    } catch (error) {
        console.error("[getTemplateById] Error:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// POST /api/templates - Update population and response format
export const createTemplate = async (req, res) => {
    try {
        const { title, description, version, company } = req.body;

        // Validation (Title and company are required by schema)
        if (!title || !company) {
            return res.status(400).json({ message: "Title and company are required", success: false });
        }

        const newTemplate = new Template({
            title,
            description,
            version, // Version has a default in schema
            company,
            ...createdBy(req), // Add createdBy
        });
        let savedTemplate = await newTemplate.save();

        // Populate after saving for accurate response
        savedTemplate = await Template.findById(savedTemplate._id)
            .populate("company", "name")
            .populate("createdBy", "name email")
            .populate("updatedBy", "name email");

        // Standard response format
        res.status(201).json({
            data: savedTemplate,
            message: "Template created successfully",
            success: true,
        });

    } catch (error) {
        console.error("[createTemplate] Error:", error);
         if (error.code === 11000) { // Handle potential duplicate error if title+company is unique
             return res.status(400).json({ message: "Template title might already exist for this company.", error: error.message, success: false });
        }
        res.status(400).json({ message: "Error creating template", error: error.message, success: false });
    }
};

// PUT /api/templates/:id - Update population and response format
export const updateTemplate = async (req, res) => {
    try {
        const { title, description, version, company } = req.body;
        const templateId = req.params.id;

        // Validation
        if (!title || !company) {
            return res.status(400).json({ message: "Title and company are required", success: false });
        }

        let updatedTemplate = await Template.findByIdAndUpdate(
            templateId,
            {
                title,
                description,
                version,
                company,
                ...updatedBy(req), // Add updatedBy
            },
            { new: true, runValidators: true }
        );

        if (!updatedTemplate) {
            return res.status(404).json({ message: "Template not found", success: false });
        }

        // Populate after update
        updatedTemplate = await Template.findById(updatedTemplate._id)
            .populate("company", "name")
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
         if (error.code === 11000) { // Handle potential duplicate error
             return res.status(400).json({ message: "Template title might already exist for this company.", error: error.message, success: false });
        }
        res.status(400).json({ message: "Error updating template", error: error.message, success: false });
    }
};

// DELETE /api/templates/:id - Update response format
export const deleteTemplate = async (req, res) => {
    try {
        const deletedTemplate = await Template.findByIdAndDelete(req.params.id);

        if (!deletedTemplate) {
            return res.status(404).json({ message: "Template not found", success: false });
        }

        // Standard response format
        res.status(200).json({
            message: "Template deleted successfully",
            success: true,
            data: deletedTemplate // Optional
        });

    } catch (error) {
        console.error("[deleteTemplate] Error:", error);
        res.status(500).json({ message: "Error deleting template", error: error.message, success: false });
    }
};