// src/controllers/siteController.js

import Site from "../models/Site.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// GET /api/sites - Filtering, Sorting, Population
export const getAllSites = asyncHandler(async (req, res, next) => {
  // Step 1: Get filter values from req.query
  const { search, company, status } = req.query;

  // Step 2: Create Mongoose query object
  const query = {};

  // Step 3: Add status and company filters
  if (status === "active" || status === "inactive") {
    query.status = status;
  }
  if (company) {
    query.company = company;
  }

  // Step 4: Add search filter (name and location fields)
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [{ name: searchRegex }, { location: searchRegex }];
  }

  // Step 5: Find data using query object
  const sites = await Site.find(query)
    .populate("company", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

  // Step 6: Count total documents
  const count = await Site.countDocuments(query);

  res.status(200).json({
    data: sites,
    count: count,
    message: "Sites fetched successfully",
    success: true,
  });
});

// GET /api/sites/:id
export const getSiteById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const site = await Site.findById(id)
    .populate("company", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!site) {
    throw new AppError("Site not found", 404);
  }

  res.status(200).json({
    data: site,
    message: "Site fetched successfully",
    success: true,
  });
});

// POST /api/sites
export const createSite = asyncHandler(async (req, res, next) => {
  const { name, location, company } = req.body;

  if (!name || !company) {
    throw new AppError("Name and company are required", 400);
  }

  const newSite = new Site({
    name,
    location,
    company,
    ...createdBy(req),
  });
  let savedSite = await newSite.save();

  // Populate after save
  savedSite = await Site.findById(savedSite._id)
    .populate("company", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(201).json({
    data: savedSite,
    message: "Site created successfully",
    success: true,
  });
});

// PUT /api/sites/:id
export const updateSite = asyncHandler(async (req, res, next) => {
  const { name, location, company } = req.body;
  const siteId = req.params.id;

  if (!name || !company) {
    throw new AppError("Name and company are required", 400);
  }

  let updatedSite = await Site.findByIdAndUpdate(
    siteId,
    {
      name,
      location,
      company,
      ...updatedBy(req),
    },
    { new: true, runValidators: true }
  );

  if (!updatedSite) {
    throw new AppError("Site not found", 404);
  }

  // Populate after update
  updatedSite = await Site.findById(updatedSite._id)
    .populate("company", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedSite,
    message: "Site updated successfully",
    success: true,
  });
});

// DELETE /api/sites/:id
export const deleteSite = asyncHandler(async (req, res, next) => {
  const deletedSite = await Site.findByIdAndDelete(req.params.id);

  if (!deletedSite) {
    throw new AppError("Site not found", 404);
  }

  res.status(200).json({
    message: "Site deleted successfully",
    success: true,
    data: deletedSite,
  });
});
