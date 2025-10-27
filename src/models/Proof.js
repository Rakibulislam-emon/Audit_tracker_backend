// src/models/Proof.js
import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const proofSchema = new mongoose.Schema(
  {
    // ✅ Relation Fields (Allow linking to one of these)
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: false, // Not always required if linked to Obs/FixAction
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
    // Validation needed in controller to ensure at least one link exists

    // --- File Details ---
    fileType: {
      // Determined from Cloudinary resource_type/mime
      type: String,
      enum: {
        values: ["image", "document", "video", "audio", "other"],
        message: "{VALUE} is not a valid file type.",
      },
      required: true,
    },
    originalName: {
      // Original filename from upload
      type: String,
      required: [true, "Original filename is required."],
      trim: true,
    },
    caption: {
      // Optional user-provided caption/description
      type: String,
      trim: true,
    },

    // --- Cloudinary Details ---
    cloudinaryId: { type: String, required: true }, // Public ID
    cloudinaryUrl: { type: String, required: true }, // Secure URL
    cloudinaryFormat: String, // File extension (e.g., pdf, jpg)
    cloudinaryResourceType: { type: String, required: true }, // image, video, raw

    // --- File Metadata ---
    size: { type: Number, required: [true, "File size is required."] }, // In bytes
    width: Number, // For images/videos
    height: Number, // For images/videos
    duration: Number, // For videos/audio

    // --- Versioning & Upload Time ---
    version: { type: Number, default: 1 }, // Simple version counter (optional use)
    uploadedAt: { type: Date, default: Date.now },

    // --- Common Fields ---
    ...commonFields, // status, createdBy, updatedBy
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index for faster lookup by related entity
proofSchema.index({ problem: 1 });
proofSchema.index({ observation: 1 });
proofSchema.index({ fixAction: 1 });

export default mongoose.models.Proof || mongoose.model("Proof", proofSchema);
