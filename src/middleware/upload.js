import fs from "fs";
import multer from "multer";
import path from "path";

// step 1: upload folder creation
const uploadDir = "uploads/proofs";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// step 2: multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // step 3: make unique file name
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// step 4: upload files types

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif", // Images
    "application/pdf", // PDF
    "video/mp4",
    "video/mpeg", // Videos
    "audio/mpeg", // Audio
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(new Error("File type not allowed"), false); // Reject file
  }
};

// step 5: multer upload instance

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter,
});
export default upload;
