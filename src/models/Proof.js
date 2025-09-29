// import mongoose from 'mongoose';
// import commonFields from './commonFields.js';

// const proofSchema = new mongoose.Schema({
//   problem: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Problem',
//     required: true
//   },
//   fileType: {
//     type: String,
//     enum: ['image', 'document', 'video', 'audio', 'other'],
//     required: true
//   },
//   originalName: {
//     type: String,
//     required: true
//   },
//   // Cloudinary fields
//   cloudinaryId: {  // Cloudinary-এর public_id
//     type: String,
//     required: true
//   },
//   cloudinaryUrl: {  // Cloudinary-এর secure URL
//     type: String,
//     required: true
//   },
//   cloudinaryFormat: {  // File format (jpg, pdf, mp4, etc.)
//     type: String
//   },
//   cloudinaryResourceType: {  // image, video, raw (for documents)
//     type: String
//   },
//   // Additional Cloudinary info
//   width: Number,  // For images/videos
//   height: Number, // For images/videos
//   duration: Number, // For videos/audio
//   size: {
//     type: Number,
//     required: true
//   },
//   caption: String,
//   version: {
//     type: Number,
//     default: 1
//   },
//   uploadedAt: {
//     type: Date,
//     default: Date.now
//   },
//   ...commonFields
// }, {
//   timestamps: true
// });

// export default mongoose.models.Proof || mongoose.model('Proof', proofSchema);

import mongoose from "mongoose";
import commonFields from "./commonFields.js";

const proofSchema = new mongoose.Schema(
  {
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    fileType: {
      type: String,
      enum: ["image", "document", "video", "audio", "other"],
      required: true,
    },
    originalName: { type: String, required: true },
    cloudinaryId: { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    cloudinaryFormat: String,
    cloudinaryResourceType: { type: String, required: true },
    width: Number,
    height: Number,
    duration: Number,
    size: { type: Number, required: true },
    caption: String,
    version: { type: Number, default: 1 },
    uploadedAt: { type: Date, default: Date.now },
    ...commonFields, // ✅ একবারই ব্যবহার করুন
  },
  {
    timestamps: true, // ✅ timestamps সঠিক যায়গায়
  }
);

export default mongoose.models.Proof || mongoose.model("Proof", proofSchema);
