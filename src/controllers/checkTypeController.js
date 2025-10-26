// src/controllers/checkTypeController.js

import CheckType from "../models/CheckType.js";
import { createdBy } from "../utils/helper.js";

// GET /api/check-types - With filtering, sorting, population
export const getAllCheckTypes = async (req, res) => {
  try {
    // Step 1: Get filter values from req.query
    const { search, status } = req.query; // Assuming you might want to filter by status or search
    console.log("[getAllCheckTypes] req.query:", req.query);

    // Step 2: Create dynamic Mongoose query object
    const query = {};

    // Step 3: Add status filter (uses 'status' from commonFields)
    if (status === "active" || status === "inactive") {
      query.status = status;
    }

    // Step 4: Add search filter (searches in 'name' and 'description')
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    // console.log("[getAllCheckTypes] Final Mongoose Query:", JSON.stringify(query));

    // Step 5: Find data using the dynamic query, populate, and sort
    const checkTypes = await CheckType.find(query)
      .populate("createdBy", "name email") // Populate creator
      .populate("updatedBy", "name email") // Populate updater
      .sort({ createdAt: -1 }); // Sort by creation date
    console.log("[getAllCheckTypes] checkTypes:",checkTypes);

    
    // Step 6: Count total matching documents
    const count = await CheckType.countDocuments(query);

    // Use standard response format
    res.status(200).json({
      data: checkTypes,
      count: count,
      message: "Check Types fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllCheckTypes] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/check-types/:id - Update population and response format
export const getCheckTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const checkType = await CheckType.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email"); // Populate updater

    if (!checkType) {
      return res
        .status(404)
        .json({ message: "CheckType not found", success: false });
    }

    // Standard response format
    res.status(200).json({
      data: checkType,
      message: "CheckType fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getCheckTypeById] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/check-types - Update population and response format
export const createCheckType = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation (Name is required in schema, description might be too)
    if (!name || !description) {
      // Added check for description based on schema
      return res
        .status(400)
        .json({ message: "Name and Description are required", success: false });
    }

    const newCheckType = new CheckType({
      name,
      description,
      ...createdBy(req), 
    });
    console.log(newCheckType,"from 96")
    let savedCheckType = await newCheckType.save();
 console.log(savedCheckType,"from 97")
    
    // Populate after saving
    savedCheckType = await CheckType.findById(savedCheckType._id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    // Standard response format
    res.status(201).json({
      data: savedCheckType,
      message: "CheckType created successfully",
      success: true,
    });
  } catch (error) {
    console.error("[createCheckType] Error:", error);
    if (error.code === 11000) {
      // Handle duplicate name error if name is unique
      return res
        .status(400)
        .json({
          message: "Check Type name already exists",
          error: error.message,
          success: false,
        });
    }
    res
      .status(400)
      .json({
        message: "Error creating check type",
        error: error.message,
        success: false,
      });
  }
};

// PUT /api/check-types/:id - Update population and response format
export const updateCheckType = async (req, res) => {
  try {
    const { name, description } = req.body;
    const checkTypeId = req.params.id;

    // Validation
    if (!name || !description) {
      // Added check for description
      return res
        .status(400)
        .json({ message: "Name and Description are required", success: false });
    }

    let updatedCheckType = await CheckType.findByIdAndUpdate(
      checkTypeId,
      {
        name,
        description,
        ...updatedBy(req), // Add updatedBy
      },
      { new: true, runValidators: true }
    );

    if (!updatedCheckType) {
      return res
        .status(404)
        .json({ message: "CheckType not found", success: false });
    }

    // Populate after update
    updatedCheckType = await CheckType.findById(updatedCheckType._id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    // Standard response format
    res.status(200).json({
      data: updatedCheckType,
      message: "CheckType updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("[updateCheckType] Error:", error);
    if (error.code === 11000) {
      // Handle duplicate name error
      return res
        .status(400)
        .json({
          message: "Check Type name already exists",
          error: error.message,
          success: false,
        });
    }
    res
      .status(400)
      .json({
        message: "Error updating check type",
        error: error.message,
        success: false,
      });
  }
};

// DELETE /api/check-types/:id - Update response format
export const deleteCheckType = async (req, res) => {
  try {
    const deletedCheckType = await CheckType.findByIdAndDelete(req.params.id);

    if (!deletedCheckType) {
      return res
        .status(404)
        .json({ message: "CheckType not found", success: false });
    }

    // Standard response format
    res.status(200).json({
      message: "CheckType deleted successfully",
      success: true,
      data: deletedCheckType, // Optional: return deleted item
    });
  } catch (error) {
    console.error("[deleteCheckType] Error:", error);
    res
      .status(500)
      .json({
        message: "Error deleting check type",
        error: error.message,
        success: false,
      });
  }
};
