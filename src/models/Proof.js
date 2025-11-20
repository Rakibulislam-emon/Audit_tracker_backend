// FILE: audit-backend/src/models/Proof.js
import mongoose from "mongoose";
import commonFields from "./commonFields.js";

// Enhanced file type mapping function
const mapFileType = (resourceType, mimeType, originalName = "") => {
  console.log("🔍 Mapping file type:", {
    resourceType,
    mimeType,
    originalName,
  });

  // Check by MIME type first (most reliable)
  if (mimeType) {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.includes("pdf")) return "document";
    if (
      mimeType.includes("document") ||
      mimeType.includes("msword") ||
      mimeType.includes("wordprocessing")
    ) {
      return "document";
    }
    if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
      return "document";
    if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
      return "document";
  }

  // Check by resource type
  if (resourceType === "image") return "image";
  if (resourceType === "video") return "video";
  if (resourceType === "raw") {
    // Check file extension for raw files
    const ext = originalName.split(".").pop()?.toLowerCase();
    if (
      [
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "csv",
      ].includes(ext)
    ) {
      return "document";
    }
    return "other";
  }

  // Final fallback: check by file extension
  const ext = originalName.split(".").pop()?.toLowerCase();
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
  const videoExtensions = ["mp4", "mov", "avi", "mkv", "webm", "m4v"];
  const audioExtensions = ["mp3", "wav", "ogg", "aac", "flac", "m4a"];
  const documentExtensions = [
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "csv",
  ];

  if (imageExtensions.includes(ext)) return "image";
  if (videoExtensions.includes(ext)) return "video";
  if (audioExtensions.includes(ext)) return "audio";
  if (documentExtensions.includes(ext)) return "document";

  console.log("❓ Could not determine file type, defaulting to 'other'");
  return "other";
};

const proofSchema = new mongoose.Schema(
  {
    // ✅ Relation Fields (Allow linking to one of these)
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: false,
    },
    observation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Observation",
      required: false,
    },
    fixAction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FixAction",
      required: false,
    },

    // --- File Details ---
    fileType: {
      type: String,
      enum: {
        values: ["image", "document", "video", "audio", "other"],
        message: "{VALUE} is not a valid file type.",
      },
      required: true,
    },
    originalName: {
      type: String,
      required: [true, "Original filename is required."],
      trim: true,
    },
    caption: {
      type: String,
      trim: true,
    },

    // --- Cloudinary Details ---
    cloudinaryId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    cloudinaryFormat: String,
    cloudinaryResourceType: { type: String, required: true },

    // --- File Metadata ---
    size: { type: Number, required: [true, "File size is required."] },
    width: Number,
    height: Number,
    duration: Number,

    // --- Versioning & Upload Time ---
    version: { type: Number, default: 1 },
    uploadedAt: { type: Date, default: Date.now },

    // --- Common Fields ---
    ...commonFields,
  },
  {
    timestamps: true,
  }
);
proofSchema.virtual("populatedFixAction", {
  ref: "FixAction",
  localField: "fixAction",
  foreignField: "_id",
  justOne: true,
});
// Index for faster lookup by related entity
proofSchema.index({ problem: 1 });
proofSchema.index({ observation: 1 });
proofSchema.index({ fixAction: 1 });

// Export the mapFileType function for use in controllers
proofSchema.statics.mapFileType = mapFileType;

export default mongoose.models.Proof || mongoose.model("Proof", proofSchema);
