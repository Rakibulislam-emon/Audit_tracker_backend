// FILE: audit-backend/src/controllers/proofController.js
import cloudinary from "../config/cloudinary.js";
import FixAction from "../models/FixAction.js";
import Proof from "../models/Proof.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import asyncHandler from "../utils/asyncHandler.js";
import AppError from "../utils/AppError.js";

// POST /api/proofs - Upload proof and link to one entity
export const uploadProof = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    throw new AppError("No file uploaded", 400);
  }

  const { fixAction, caption } = req.body;

  // Step 1: Get complete FixAction data
  const fixActionData = await FixAction.findById(fixAction)
    .populate("problem", "title description severity")
    .populate("observation", "questionText severity answer")
    .populate("owner", "name email");

  if (!fixActionData) {
    // Cleanup Cloudinary file if FixAction not found
    if (req.file?.filename) {
      await cloudinary.uploader.destroy(req.file.filename, {
        resource_type: req.file.resource_type || "auto",
      });
    }
    throw new AppError("Fix Action not found in database.", 404);
  }

  // Step 2: Create Proof with related IDs
  const file = req.file;
  const fileType = Proof.mapFileType(
    file.resource_type || "auto",
    file.mimetype,
    file.originalname
  );

  const newProof = new Proof({
    fixAction: fixActionData._id,
    problem: fixActionData.problem?._id || null,
    observation: fixActionData.observation?._id || null,
    fileType: fileType,
    originalName: file.originalname,
    caption: caption || "",
    cloudinaryId: file.filename,
    cloudinaryUrl: file.path,
    cloudinaryFormat: file.format,
    cloudinaryResourceType: file.resource_type || "auto",
    size: file.size,
    uploadedAt: new Date(),
    ...createdBy(req),
  });

  let savedProof = await newProof.save();

  // Step 3: Populate necessary fields
  savedProof = await Proof.findById(savedProof._id)
    .populate("problem", "title description severity")
    .populate("observation", "questionText severity answer")
    .populate("fixAction", "actionText deadline status")
    .populate("createdBy", "name email");

  res.status(201).json({
    data: savedProof,
    message: "Proof uploaded and saved successfully",
    success: true,
  });
});

// GET /api/proofs - With filtering and population
export const getAllProofs = asyncHandler(async (req, res, next) => {
  const {
    search,
    problem,
    observation,
    fixAction,
    fileType,
    status,
    uploader,
  } = req.query;

  const query = {};

  // Add filters
  if (problem) query.problem = problem;
  if (observation) query.observation = observation;
  if (fixAction) query.fixAction = fixAction;
  if (
    fileType &&
    ["image", "document", "video", "audio", "other"].includes(fileType)
  ) {
    query.fileType = fileType;
  }
  if (status === "active" || status === "inactive") query.status = status;
  if (uploader) query.createdBy = uploader;

  // Search filter
  if (search) {
    const searchRegex = { $regex: search, $options: "i" };
    query.$or = [{ originalName: searchRegex }, { caption: searchRegex }];
  }

  // Enhanced population
  const proofs = await Proof.find(query)
    .populate("problem", "title")
    .populate("observation", "questionText severity")
    .populate("fixAction", "actionText deadline")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ uploadedAt: -1 });

  const count = await Proof.countDocuments(query);

  res.status(200).json({
    data: proofs,
    count: count,
    message: "Proofs fetched successfully",
    success: true,
  });
});

// GET /api/proofs/:id - Update population
export const getProofById = asyncHandler(async (req, res, next) => {
  const proof = await Proof.findById(req.params.id)
    .populate("problem", "title")
    .populate("observation", "questionText severity")
    .populate("fixAction", "actionText deadline")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!proof) {
    throw new AppError("Proof not found", 404);
  }

  res.status(200).json({
    data: proof,
    message: "Proof fetched successfully",
    success: true,
  });
});

// PATCH /api/proofs/:id - Update caption or status
export const updateProof = asyncHandler(async (req, res, next) => {
  const { caption, status } = req.body;
  const proofId = req.params.id;

  const updateData = { ...updatedBy(req) };
  if (caption !== undefined) updateData.caption = caption;
  if (status === "active" || status === "inactive") {
    updateData.status = status;
  }

  // Prevent updating other fields via this route
  if (Object.keys(updateData).length <= 1 && !caption && !status) {
    throw new AppError("No updatable fields provided (caption, status).", 400);
  }

  let updatedProof = await Proof.findByIdAndUpdate(proofId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedProof) {
    throw new AppError("Proof not found", 404);
  }

  // Repopulate for response
  updatedProof = await Proof.findById(updatedProof._id)
    .populate("problem", "title")
    .populate("observation", "questionText severity")
    .populate("fixAction", "actionText deadline")
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  res.status(200).json({
    data: updatedProof,
    message: "Proof updated successfully",
    success: true,
  });
});

// DELETE /api/proofs/:id - Delete from Cloudinary and DB
export const deleteProof = asyncHandler(async (req, res, next) => {
  const proof = await Proof.findById(req.params.id);
  if (!proof) {
    throw new AppError("Proof not found", 404);
  }

  // Delete from Cloudinary first
  try {
    await cloudinary.uploader.destroy(proof.cloudinaryId, {
      resource_type: proof.cloudinaryResourceType || "auto",
    });
  } catch (cldError) {
    console.warn(
      "⚠️ Cloudinary deletion failed (might need manual cleanup):",
      cldError.message
    );
  }

  // Delete from DB
  const deletedProof = await Proof.findByIdAndDelete(req.params.id);

  res.status(200).json({
    message: "Proof deleted successfully",
    success: true,
    data: deletedProof,
  });
});
