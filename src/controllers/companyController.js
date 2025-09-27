import Company from "../models/Company.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// GET /api/companies
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find()
      .populate("group", "name") // Only show 'name' from Group
      .populate("createdBy", "name email");
    res.status(200).json(companies);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/companies/:id
export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate("group", "name")
      .populate("createdBy", "name email");
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.status(200).json(company);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// POST /api/companies
export const createCompany = async (req, res) => {
  try {
    const { name, group, sector, address } = req.body;

    if (!name || !group) {
      return res.status(400).json({ message: "Name and group are required" });
    }

    const newCompany = new Company({
      name,
      group,
      sector,
      address,
      ...createdBy(req),
    });
    const savedCompany = await newCompany.save();

    res.status(201).json(savedCompany);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating company", error: error.message });
  }
};

// PUT /api/companies/:id
export const updateCompany = async (req, res) => {
  try {
    const { name, group, sector, address } = req.body;
    const companyId = req.params.id;

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      { name, group, sector, address, ...updatedBy(req) },
      { new: true, runValidators: true }
    );

    if (!updatedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.status(200).json(updatedCompany);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating company", error: error.message });
  }
};

// DELETE /api/companies/:id
export const deleteCompany = async (req, res) => {
  try {
    const deletedCompany = await Company.findByIdAndDelete(req.params.id);
    if (!deletedCompany) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.status(200).json({ message: "Company deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting company", error: error.message });
  }
};
