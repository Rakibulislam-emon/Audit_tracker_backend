// src/controllers/proofController.js

import cloudinary from "../config/cloudinary.js"; // Ensure correct path
import FixAction from "../models/FixAction.js";
import Observation from "../models/Observation.js";
import Problem from "../models/Problem.js"; // Import related models if needed for validation/linking
import Proof from "../models/Proof.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// Helper: determine fileType from Cloudinary resource_type + MIME
const mapFileType = (resourceType, mimeType) => {
  if (resourceType === "image") return "image";
  if (resourceType === "video") return "video";
  // Cloudinary often classifies audio as 'video' or 'raw'
  if (resourceType === "video" && mimeType?.startsWith("audio/"))
    return "audio";
  if (mimeType?.includes("audio")) return "audio";
  // PDFs, Docs etc are usually 'raw' or 'image' (if preview generated)
  if (
    resourceType === "raw" ||
    mimeType?.includes("pdf") ||
    mimeType?.includes("document")
  )
    return "document";
  return "other";
};

// POST /api/proofs - Upload proof and link to one entity
export const uploadProof = async (req, res) => {
  console.log("📁 req.file:", req.file); // Log file details from multer/cloudinary storage
  console.log("📄 req.body:", req.body); // Log text fields

  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "No file uploaded", success: false });
    }

    // Extract relation IDs and caption from body
    const { problem, observation, fixAction, caption } = req.body;

    // ✅ Validation: Ensure at least one relation ID is provided
    if (!problem && !observation && !fixAction) {
      // Clean up uploaded file if validation fails early
      if (req.file?.filename)
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: req.file.resource_type || "auto",
        });
      return res
        .status(400)
        .json({
          message:
            "Proof must be linked to a Problem, Observation, or Fix Action ID.",
          success: false,
        });
    }

    // Optional: Validate if the provided IDs actually exist in their respective collections
    // (Adds DB checks but ensures integrity)
    if (problem && !(await Problem.findById(problem))) {
      if (req.file?.filename)
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: req.file.resource_type || "auto",
        });
      return res
        .status(400)
        .json({ message: "Invalid Problem ID provided.", success: false });
    }
    if (observation && !(await Observation.findById(observation))) {
      if (req.file?.filename)
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: req.file.resource_type || "auto",
        });
      return res
        .status(400)
        .json({ message: "Invalid Observation ID provided.", success: false });
    }
    if (fixAction && !(await FixAction.findById(fixAction))) {
      if (req.file?.filename)
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: req.file.resource_type || "auto",
        });
      return res
        .status(400)
        .json({ message: "Invalid Fix Action ID provided.", success: false });
    }

    const file = req.file;

    // Extract Cloudinary data robustly
    const cloudinaryId = file.filename || file.public_id; // Storage engine might use filename
    const cloudinaryUrl = file.path || file.secure_url; // Storage engine might use path
    const resourceType = file.resource_type || "auto"; // Default to auto if not provided
    const format = file.format || cloudinaryUrl?.split(".").pop().split("?")[0];

    // Create new proof document
    const newProof = new Proof({
      // Link to only ONE provided ID
      problem: problem || null,
      observation: observation || null,
      fixAction: fixAction || null,
      fileType: mapFileType(resourceType, file.mimetype),
      originalName: file.originalname,
      caption, // Add caption
      cloudinaryId,
      cloudinaryUrl,
      cloudinaryFormat: format,
      cloudinaryResourceType: resourceType,
      size: file.size,
      width: file.width, // May be null/undefined
      height: file.height, // May be null/undefined
      duration: file.duration, // May be null/undefined
      uploadedAt: new Date(),
      ...createdBy(req),
      // status defaults to 'active'
    });

    let savedProof = await newProof.save(); // Mongoose pre-save hook also validates relation
    console.log("✅ Proof saved successfully:", savedProof._id);

    // Repopulate for accurate response
    savedProof = await Proof.findById(savedProof._id)
      .populate("problem", "title")
      .populate("observation", "_id severity") // Populate some Observation fields
      .populate("fixAction", "actionText") // Populate some FixAction fields
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    return res.status(201).json({
      data: savedProof,
      message: "Proof uploaded and saved successfully",
      success: true,
    });
  } catch (error) {
    console.error("❌ Upload proof error:", error);

    // Cleanup Cloudinary file if DB save failed AFTER upload succeeded
    if (req.file?.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: req.file.resource_type || "auto",
        });
        console.log("🗑️ Cleaned up Cloudinary file after DB error");
      } catch (delErr) {
        console.warn("Failed to clean up Cloudinary file:", delErr.message);
      }
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((el) => el.message)
        .join(" ");
      return res
        .status(400)
        .json({
          message: messages || error.message,
          error: error.errors,
          success: false,
        });
    }
    return res
      .status(500)
      .json({
        message: error.message || "Error uploading proof",
        success: false,
      });
  }
};

// GET /api/proofs - With filtering and population
export const getAllProofs = async (req, res) => {
  try {
    // Step 1: Get filter values
    const {
      search,
      problem,
      observation,
      fixAction,
      fileType,
      status,
      uploader,
    } = req.query;
    console.log("[getAllProofs] req.query:", req.query);

    // Step 2: Create query object
    const query = {};

    // Step 3: Add filters
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
    if (uploader) query.createdBy = uploader; // Filter by user who uploaded

    // Step 4: Add search filter (searches originalName and caption)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [{ originalName: searchRegex }, { caption: searchRegex }];
    }

    console.log("[getAllProofs] Final Mongoose Query:", JSON.stringify(query));

    // Step 5: Find data, populate relationships, and sort
    const proofs = await Proof.find(query)
      .populate("problem", "title")
      .populate("observation", "_id severity") // Keep it light
      .populate("fixAction", "actionText") // Keep it light
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ uploadedAt: -1 }); // Sort by upload date (descending)

    // Step 6: Count total matching documents
    const count = await Proof.countDocuments(query);

    // Standard response format
    res.status(200).json({
      data: proofs,
      count: count,
      message: "Proofs fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllProofs] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/proofs/:id - Update population
export const getProofById = async (req, res) => {
  try {
    const proof = await Proof.findById(req.params.id)
      .populate("problem", "title")
      .populate("observation", "_id severity")
      .populate("fixAction", "actionText")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!proof)
      return res
        .status(404)
        .json({ message: "Proof not found", success: false });

    res
      .status(200)
      .json({
        data: proof,
        message: "Proof fetched successfully",
        success: true,
      });
  } catch (error) {
    console.error("[getProofById] Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH /api/proofs/:id - Update caption or status
export const updateProof = async (req, res) => {
  try {
    // Only allow updating caption and status for simplicity
    const { caption, status } = req.body;
    const proofId = req.params.id;

    const updateData = { ...updatedBy(req) };
    if (caption !== undefined) updateData.caption = caption;
    if (status === "active" || status === "inactive")
      updateData.status = status;

    // Prevent updating other fields via this route
    if (Object.keys(updateData).length <= 1 && !caption && !status) {
      // <=1 because updatedBy is always there
      return res
        .status(400)
        .json({
          message: "No updatable fields provided (caption, status).",
          success: false,
        });
    }

    let updatedProof = await Proof.findByIdAndUpdate(proofId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProof)
      return res
        .status(404)
        .json({ message: "Proof not found", success: false });

    // Repopulate for response
    updatedProof = await Proof.findById(updatedProof._id)
      .populate("problem", "title")
      .populate("observation", "_id severity")
      .populate("fixAction", "actionText")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    res
      .status(200)
      .json({
        data: updatedProof,
        message: "Proof updated successfully",
        success: true,
      });
  } catch (error) {
    console.error("[updateProof] Error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((el) => el.message)
        .join(" ");
      return res
        .status(400)
        .json({
          message: messages || error.message,
          error: error.errors,
          success: false,
        });
    }
    res
      .status(400)
      .json({
        message: "Error updating proof",
        error: error.message,
        success: false,
      });
  }
};

// DELETE /api/proofs/:id - Delete from Cloudinary and DB
export const deleteProof = async (req, res) => {
  try {
    const proof = await Proof.findById(req.params.id);
    if (!proof) {
      return res
        .status(404)
        .json({ message: "Proof not found", success: false });
    }

    // Delete from Cloudinary first
    try {
      await cloudinary.uploader.destroy(proof.cloudinaryId, {
        resource_type: proof.cloudinaryResourceType || "auto",
      });
      console.log("🗑️ Deleted proof from Cloudinary:", proof.cloudinaryId);
    } catch (cldError) {
      // Log the error but proceed to delete from DB anyway
      console.warn(
        "⚠️ Cloudinary deletion failed (might need manual cleanup):",
        cldError.message
      );
    }

    // Delete from DB
    const deletedProof = await Proof.findByIdAndDelete(req.params.id);

    res
      .status(200)
      .json({
        message: "Proof deleted successfully",
        success: true,
        data: deletedProof,
      });
  } catch (error) {
    console.error("[deleteProof] Error:", error);
    res
      .status(500)
      .json({
        message: "Error deleting proof",
        error: error.message,
        success: false,
      });
  }
};
