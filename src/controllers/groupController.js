import Group from "../models/Group.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// get all groups
export const getAllGroups = asyncHandler(async (req, res, next) => {
  const groups = await Group.find();
  res.status(200).json({
    data: groups,
    message: "Groups fetched successfully",
    success: true,
    count: groups.length,
  });
});

// get group by id
export const getGroupById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const group = await Group.findById(id);
  if (!group) {
    throw new AppError("Group not found", 404);
  }
  res.status(200).json(group);
});

// create a new group
export const createGroup = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;
  if (!name || !description) {
    throw new AppError("Group name and description is required", 400);
  }
  const newGroup = new Group({
    name,
    description,
    ...createdBy(req),
  });
  const savedGroup = await newGroup.save();
  res.status(201).json(savedGroup);
});

// update group by id
export const updateGroup = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name) {
    throw new AppError("Group name is required", 400);
  }

  const updatedGroup = await Group.findByIdAndUpdate(
    id,
    { name, description, ...updatedBy(req) },
    { new: true, runValidators: true }
  );

  if (!updatedGroup) {
    throw new AppError("Group not found", 404);
  }
  res.status(200).json(updatedGroup);
});

// delete group by id
export const deleteGroup = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const deleteGroup = await Group.findByIdAndDelete(id);
  if (!deleteGroup) {
    throw new AppError("Group not found", 404);
  }
  res.status(200).json({ message: "Group deleted successfully" });
});
