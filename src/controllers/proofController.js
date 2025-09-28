import Proof from "../models/Proof.js";
import { createdBy, updatedBy } from "../utils/helper.js";
import fs from 'fs';


/ ১. File upload function
export const uploadProof = async (req, res) => {
  try {
    console.log("Upload request received:", req.file, req.body);

    // ২. Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // ৩. Get data from request
    const { problem, caption } = req.body;

    if (!problem) {
      // যদি problem ID না থাকে, তাহলে uploaded file delete করুন
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Problem ID is required" });
    }

    // ৪. Determine file type
    const getFileType = (mimeType) => {
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType.startsWith('video/')) return 'video';
      if (mimeType.startsWith('audio/')) return 'audio';
      return 'document';
    };

    // ৫. Create new Proof document
    const newProof = new Proof({
      problem: problem,
      fileType: getFileType(req.file.mimetype),
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
      caption: caption,
      uploadedAt: new Date(),
      ...createdBy(req)
    });

    // ৬. Save to database
    const savedProof = await newProof.save();
    
    // ৭. Send response
    res.status(201).json({
      savedProof: {
        ...savedProof.toObject(),
        fileUrl: `/api/proofs/file/${savedProof.fileName}`  // Frontend-এ access করার URL
      },
      message: "Proof uploaded successfully"
    });

  } catch (error) {
    console.error("Upload error:", error);
    
    // ৮. Error হলে file delete করুন
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(400).json({ message: "Error uploading proof" });
  }
};
