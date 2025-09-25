// src/controllers/siteController.js

import Site from "../models/Site.js";
import { createdBy, updatedBy } from "../utils/helper.js";

export const getAllSites = async (req, res) => {
  try {
    const sites = await Site.find()
      .populate("company", "name")
      .populate("createdBy", "name email");
    res.status(200).json(sites);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getSiteById = async (req, res) => {
  try {
    const { id } = req.params;
    const site = await Site.findById(id)
      .populate("company", "name")
      .populate("createdBy", "name email");
    if (!site) {
      return res.status(404).json({ message: "Site not found" });
    }
    res.status(200).json(site);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createSite = async (req, res) => {
  try {
    const { name, location, company } = req.body;

    if (!name || !company) {
      return res.status(400).json({ message: "Name and company are required" });
    }

    const newSite = new Site({ name, location, company ,...createdBy(req)});
    const savedSite = await newSite.save();

    res.status(201).json(savedSite);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating site", error: error.message });
  }
};

export const updateSite = async (req, res) => {
  try {
    const { name, location, company } = req.body;
    const siteId = req.params.id;

    const updatedSite = await Site.findByIdAndUpdate(
      siteId,
      { name, location, company ,...updatedBy(req)},
      { new: true, runValidators: true }
    );

    if (!updatedSite) {
      return res.status(404).json({ message: "Site not found" });
    }

    res.status(200).json(updatedSite);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating site", error: error.message });
  }
};

export const deleteSite = async (req, res) => {
  try {
    const deletedSite = await Site.findByIdAndDelete(req.params.id);
    if (!deletedSite) {
      return res.status(404).json({ message: "Site not found" });
    }
    res.status(200).json({ message: "Site deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting site", error: error.message });
  }
};
