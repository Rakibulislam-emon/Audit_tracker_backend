import Group from "../models/Group.js";
import { creationInfo } from "../utils/creationInfo.js";
// get all groups
export const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find();
    res.status(200).json(groups);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching groups", error: error.message });
  }
};

// get group by id
export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }
    res.status(200).json(group);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching group", error: error.message });
  }
};

// create a new group
export const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }
    const newGroup = new Group({
      name,
      ...creationInfo(req),
    });
    const savedGroup = await newGroup.save();
    res.status(201).json(savedGroup);
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error creating group", error: error.message });
  }
};

// update group by id
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Group name is required" });
    }
    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );
    if (!updatedGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    res.status(200).json(updatedGroup);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating group", error: error.message });
  }
};
// delete group by id

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteGroup = await Group.findByIdAndDelete(id);
    if (!deleteGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    res.status(204).json({ message: "Group deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting group", error: error.message });
  }
};
