import CheckType from "../models/CheckType.js";
import { createdBy, updatedBy } from "../utils/helper.js";

export const getAllCheckTypes = async (req, res) => {
  try {
    const checkTypes = await CheckType.find().populate(
      "createdBy",
      "name email"
    );
    res.status(200).json(checkTypes);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getCheckTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const checkType = await CheckType.findById(id).populate(
      "createdBy",
      "name email"
    );
    if (!checkType) {
      return res.status(404).json({ message: "CheckType not found" });
    }
    res.status(200).json(checkType);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const createCheckType = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const newCheckType = new CheckType({
      name,
      description,
      ...createdBy(req),
    });
    const savedCheckType = await newCheckType.save();

    res
      .status(201)
      .json(savedCheckType, { message: "CheckType created successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating check type", error: error.message });
  }
};

export const updateCheckType = async (req, res) => {
  try {
    const { name, description } = req.body;
    const checkTypeId = req.params.id;

    const updatedCheckType = await CheckType.findByIdAndUpdate(
      checkTypeId,
      { name, description ,...updatedBy(req)},
      { new: true, runValidators: true }
    );

    if (!updatedCheckType) {
      return res.status(404).json({ message: "CheckType not found" });
    }

    res.status(200).json(updatedCheckType, { message: "CheckType updated successfully" });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating check type", error: error.message });
  }
};

export const deleteCheckType = async (req, res) => {
  try {
    const deletedCheckType = await CheckType.findByIdAndDelete(req.params.id);
    if (!deletedCheckType) {
      return res.status(404).json({ message: "CheckType not found" });
    }
    res.status(200).json({ message: "CheckType deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting check type", error: error.message });
  }
};
