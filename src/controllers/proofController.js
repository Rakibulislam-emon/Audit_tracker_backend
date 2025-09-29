import cloudinary from "../config/cloudinary.js";
import Proof from "../models/Proof.js";
import { createdBy, updatedBy } from "../utils/helper.js";

// Helper: determine fileType from Cloudinary resource_type + MIME
const mapFileType = (resourceType, mimeType) => {
  if (resourceType === "image") return "image";
  if (resourceType === "video") return "video";
  if (resourceType === "raw") {
    if (mimeType?.includes("audio")) return "audio";
    return "document";
  }
  return "other";
};

// ✅ Upload proof - FIXED VERSION
export const uploadProof = async (req, res) => {
  console.log("📁 req.file:", req.file);
  console.log("📄 req.body:", req.body);

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { problem, caption } = req.body;

    // Check if problem ID exists in DB if exist then continue
    if (!problem) {
      return res.status(400).json({ message: "Problem ID is required" });
    }
    // Check if problem ID exists in DB
    const existingProof = await Proof.findOne({ problem });
    if (!existingProof) {
      return res.status(400).json({ message: "Invalid Problem ID" });
    }
    
    const file = req.file;

    // ✅ Cloudinary data extraction - FIXED
    const cloudinaryId = file.filename || file.public_id;
    const cloudinaryUrl = file.path || file.secure_url;

    // ✅ Format extraction
    let cloudinaryFormat = file.format;
    if (!cloudinaryFormat && cloudinaryUrl) {
      cloudinaryFormat = cloudinaryUrl.split(".").pop().split("?")[0];
    }

    // ✅ Resource type determination - FIXED
    let resourceType = file.resource_type;
    if (!resourceType) {
      if (file.mimetype?.startsWith("video/")) {
        resourceType = "video";
      } else if (file.mimetype?.startsWith("audio/")) {
        resourceType = "raw";
      } else if (file.mimetype && !file.mimetype.startsWith("image/")) {
        resourceType = "raw";
      } else {
        resourceType = "image";
      }
    }

    // ✅ Create new proof document
    const newProof = new Proof({
      problem,
      fileType: mapFileType(resourceType, file.mimetype),
      originalName: file.originalname,
      cloudinaryId,
      cloudinaryUrl,
      cloudinaryFormat,
      cloudinaryResourceType: resourceType,
      width: file.width || undefined,
      height: file.height || undefined,
      duration: file.duration || undefined,
      size: file.size,
      caption,
      ...createdBy(req),
      uploadedAt: new Date(),
    });

    const savedProof = await newProof.save();
    console.log("✅ Proof saved successfully:", savedProof._id);

    return res.status(201).json({
      savedProof,
      message: "Proof uploaded successfully to Cloudinary",
    });
  } catch (error) {
    console.error("❌ Upload error:", error);

    // Clean up from Cloudinary if needed
    if (req.file) {
      const cloudinaryId = req.file.filename || req.file.public_id;
      if (cloudinaryId) {
        try {
          await cloudinary.uploader.destroy(cloudinaryId, {
            resource_type: "auto",
          });
          console.log("🗑️ Cleaned up Cloudinary file");
        } catch (delErr) {
          console.warn("Failed to clean up Cloudinary file:", delErr.message);
        }
      }
    }

    return res.status(500).json({
      message: error.message || "Error uploading proof",
    });
  }
};

// ✅ Get all proofs - FIXED VERSION
export const getAllProofs = async (req, res) => {
  console.log("🔍 Received request for all proofs");
  try {
    const proofs = await Proof.find()
      .populate("problem", "title")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 }); // ✅ নতুন proof আগে দেখাবে

    console.log(`✅ Fetched ${proofs.length} proofs`);

    res.json({
      proofs,
      message: "Proofs retrieved successfully",
    });
  } catch (error) {
    console.error("❌ Get all proofs error:", error);
    res.status(500).json({
      message: "Server error: " + error.message,
    });
  }
};

// ✅ Get proof by ID - FIXED VERSION
export const getProofById = async (req, res) => {
  try {
    const proof = await Proof.findById(req.params.id)
      .populate("problem", "title")
      .populate("createdBy", "name email");

    if (!proof) {
      return res.status(404).json({ message: "Proof not found" });
    }

    res.json({
      proof,
      message: "Proof retrieved successfully",
    });
  } catch (error) {
    console.error("❌ Get proof by ID error:", error);
    res.status(500).json({
      message: "Server error: " + error.message,
    });
  }
};

// ✅ Delete proof - FIXED VERSION
export const deleteProof = async (req, res) => {
  try {
    const proof = await Proof.findById(req.params.id);
    if (!proof) {
      return res.status(404).json({ message: "Proof not found" });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(proof.cloudinaryId, {
      resource_type: proof.cloudinaryResourceType || "auto",
    });

    // Delete from DB
    await Proof.findByIdAndDelete(req.params.id);

    res.json({
      message: "Proof deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete error:", error);
    res.status(500).json({
      message: "Error deleting proof: " + error.message,
    });
  }
};

// ✅ Update proof - FIXED VERSION
export const updateProof = async (req, res) => {
  try {
    const { caption, status } = req.body;

    const proof = await Proof.findByIdAndUpdate(
      req.params.id,
      {
        caption,
        ...updatedBy(req),
      },
      { new: true, runValidators: true }
    );

    if (!proof) {
      return res.status(404).json({ message: "Proof not found" });
    }

    res.json({
      updatedProof: proof,
      message: "Proof updated successfully",
    });
  } catch (error) {
    console.error("❌ Update error:", error);
    res.status(400).json({
      message: error.message || "Update failed",
    });
  }
};

// ✅ Utility function for optimized URLs
export const getOptimizedImageUrl = (proof, options = {}) => {
  if (proof.fileType !== "image") return proof.cloudinaryUrl;

  const {
    width = 800,
    height = 600,
    quality = "auto",
    format = "webp",
  } = options;

  return cloudinary.url(proof.cloudinaryId, {
    width,
    height,
    crop: "fill",
    quality,
    format,
    secure: true,
  });
};
