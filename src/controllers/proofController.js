// FILE: audit-backend/src/controllers/proofController.js
import cloudinary from "../config/cloudinary.js";
import FixAction from "../models/FixAction.js";
import Proof from "../models/Proof.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// POST /api/proofs - Upload proof and link to one entity
export const uploadProof = async (req, res) => {
  console.log("📁 req.file:", req.file);
  console.log("📄 req.body:", req.body);

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
        success: false,
      });
    }

    const { fixAction, caption } = req.body;

    // ✅ STEP 1: FixAction ID দিয়ে সম্পূর্ণ FixAction data নিন
    console.log("🔍 STEP 1 - Getting complete FixAction data...");

    const fixActionData = await FixAction.findById(fixAction)
    
    // .populate("fixactions", "actionText deadline")
      .populate("problem", "title description severity") // Problem details
      .populate("observation", "questionText severity answer") // Observation details
      .populate("owner", "name email"); // Owner details
 

      console.log('fixActionData:', fixActionData)
    if (!fixActionData) {
      if (req.file?.filename) {
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: req.file.resource_type || "auto",
        });
      }
      return res.status(404).json({
        message: "Fix Action not found in database.",
        success: false,
      });
    }

    console.log("✅ FixAction data retrieved:", {
      actionText: fixActionData.actionText,
      problem: fixActionData.problem
        ? {
            id: fixActionData.problem._id,
            title: fixActionData.problem.title,
          }
        : null,
      observation: fixActionData.observation
        ? {
            id: fixActionData.observation._id,
            questionText: fixActionData.observation.questionText,
          }
        : null,
      owner: fixActionData.owner?.name,
    });

    // ✅ STEP 2: Proof create করুন সাথে related IDs দিয়ে
    const file = req.file;
    const fileType = Proof.mapFileType(
      file.resource_type || "auto",
      file.mimetype,
      file.originalname
    );

    const newProof = new Proof({
      // ✅ সব related IDs save করুন
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
    console.log("✅ Proof saved successfully:", savedProof._id);

    // ✅ STEP 3: Simple population - শুধু necessary fields
    savedProof = await Proof.findById(savedProof._id)
      .populate("problem", "title description severity")
      .populate("observation", "questionText severity answer")
      .populate("fixAction", "actionText deadline status")
      .populate("createdBy", "name email");

    console.log("✅ Final proof data for frontend:", {
      proofId: savedProof._id,
      problemTitle: savedProof.problem?.title,
      observationQuestion: savedProof.observation?.questionText,
      fixActionText: savedProof.fixAction?.actionText,
      uploadedBy: savedProof.createdBy?.name,
    });

    return res.status(201).json({
      data: savedProof,
      message: "Proof uploaded and saved successfully",
      success: true,
    });
  } catch (error) {
    console.error("❌ Upload proof error:", error);

    // Cleanup Cloudinary file if DB save failed
    if (req.file?.filename) {
      try {
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: req.file.resource_type || "auto",
        });
      } catch (delErr) {
        console.warn("Failed to clean up Cloudinary file:", delErr.message);
      }
    }

    return res.status(500).json({
      message: error.message || "Error uploading proof",
      success: false,
    });
  }
};
// GET /api/proofs - With filtering and population
export const getAllProofs = async (req, res) => {
  try {
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

    console.log("[getAllProofs] Final Query:", JSON.stringify(query));

    // ✅ ENHANCED POPULATION - FIX ALL "Not Set" ISSUES
    const proofs = await Proof.find(query)
      .populate("problem", "title")
      .populate("observation", "questionText severity")
      .populate("fixAction", "actionText deadline")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ uploadedAt: -1 });

    const count = await Proof.countDocuments(query);

    // ✅ DEBUG: Check what data is being returned
    console.log(`[getAllProofs] Found ${proofs.length} proofs`);
    if (proofs.length > 0) {
      console.log("Sample proof data:", {
        id: proofs[0]._id,
        problem: proofs[0].problem?.title,
        observation: proofs[0].observation?.questionText,
        fixAction: proofs[0].fixAction?.actionText,
        fileType: proofs[0].fileType,
        createdBy: proofs[0].createdBy?.name,
      });
    }

    res.status(200).json({
      data: proofs,
      count: count,
      message: "Proofs fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getAllProofs] Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// GET /api/proofs/:id - Update population
export const getProofById = async (req, res) => {
  try {
    const proof = await Proof.findById(req.params.id)
      .populate("problem", "title")
      .populate("observation", "questionText severity")
      .populate("fixAction", "actionText deadline")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!proof) {
      return res.status(404).json({
        message: "Proof not found",
        success: false,
      });
    }

    res.status(200).json({
      data: proof,
      message: "Proof fetched successfully",
      success: true,
    });
  } catch (error) {
    console.error("[getProofById] Error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// PATCH /api/proofs/:id - Update caption or status
export const updateProof = async (req, res) => {
  try {
    const { caption, status } = req.body;
    const proofId = req.params.id;

    const updateData = { ...updatedBy(req) };
    if (caption !== undefined) updateData.caption = caption;
    if (status === "active" || status === "inactive") {
      updateData.status = status;
    }

    // Prevent updating other fields via this route
    if (Object.keys(updateData).length <= 1 && !caption && !status) {
      return res.status(400).json({
        message: "No updatable fields provided (caption, status).",
        success: false,
      });
    }

    let updatedProof = await Proof.findByIdAndUpdate(proofId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProof) {
      return res.status(404).json({
        message: "Proof not found",
        success: false,
      });
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
  } catch (error) {
    console.error("[updateProof] Error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((el) => el.message)
        .join(" ");
      return res.status(400).json({
        message: messages || error.message,
        error: error.errors,
        success: false,
      });
    }
    res.status(400).json({
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
      return res.status(404).json({
        message: "Proof not found",
        success: false,
      });
    }

    // Delete from Cloudinary first
    try {
      await cloudinary.uploader.destroy(proof.cloudinaryId, {
        resource_type: proof.cloudinaryResourceType || "auto",
      });
      console.log("🗑️ Deleted proof from Cloudinary:", proof.cloudinaryId);
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
  } catch (error) {
    console.error("[deleteProof] Error:", error);
    res.status(500).json({
      message: "Error deleting proof",
      error: error.message,
      success: false,
    });
  }
};
