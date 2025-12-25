import Company from "../models/Company.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";
import { validateEntityCreation } from "../utils/authority.js";

// GET /api/companies
export const getAllCompanies = asyncHandler(async (req, res, next) => {
  // Step 1: Get filter values from req.query
  const { search, group, status } = req.query;

  // Step 2: Create dynamic query object
  const query = {};

  // Step 3: Add status and group filters
  if (status === "active" || status === "inactive") {
    query.status = status;
  }
  if (group) {
    query.group = group;
  }

  // Step 4: Add search filter
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [
      { name: searchRegex },
      { sector: searchRegex },
      { address: searchRegex },
    ];
  }

  // Step 5: Find data using query object
  const companies = await Company.find(query)
    .populate("group", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 });

  // Step 6: Count total documents
  const count = await Company.countDocuments(query);

  res.status(200).json({
    data: companies,
    message: "Companies fetched successfully",
    success: true,
    count: count,
  });
});

// GET /api/companies/:id
export const getCompanyById = asyncHandler(async (req, res, next) => {
  const company = await Company.findById(req.params.id)
    .populate("group", "name")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!company) {
    throw new AppError("Company not found", 404);
  }

  res.status(200).json({
    data: company,
    message: "Company fetched successfully",
    success: true,
  });
});

// POST /api/companies
export const createCompany = asyncHandler(async (req, res, next) => {
  const { name, group, sector, address } = req.body;

  // INTELLIGENT AUTO-FILL: Fill group from requester if missing (for jailed admins)
  const finalGroup =
    group ||
    (req.user.assignedGroup ? req.user.assignedGroup.toString() : null);

  if (!name || !finalGroup) {
    throw new AppError("Name and group are required", 400);
  }

  // Authority Validation
  validateEntityCreation(req.user, "company", { group: finalGroup });

  const newCompany = new Company({
    name,
    group: finalGroup,
    sector,
    address,
    ...createdBy(req),
  });
  const savedCompany = await newCompany.save();

  res.status(201).json(savedCompany);
});

// PUT /api/companies/:id
export const updateCompany = asyncHandler(async (req, res, next) => {
  const { name, group, sector, address } = req.body;
  const companyId = req.params.id;

  const updatedCompany = await Company.findByIdAndUpdate(
    companyId,
    { name, group, sector, address, ...updatedBy(req) },
    { new: true, runValidators: true }
  )
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!updatedCompany) {
    throw new AppError("Company not found", 404);
  }

  res.status(200).json({
    data: updatedCompany,
    message: "Companies updated successfully",
    success: true,
  });
});

// DELETE /api/companies/:id
export const deleteCompany = asyncHandler(async (req, res, next) => {
  const deletedCompany = await Company.findByIdAndDelete(req.params.id);
  if (!deletedCompany) {
    throw new AppError("Company not found", 404);
  }
  res.status(200).json({ message: "Company deleted successfully" });
});
