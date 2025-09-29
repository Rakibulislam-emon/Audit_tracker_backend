import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Allowed MIME types
const ALLOWED_MIME_TYPES = {
  image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ],
  video: [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/x-msvideo",
    "video/webm",
  ],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"],
};

const getAllowedMimeTypes = () => [
  ...ALLOWED_MIME_TYPES.image,
  ...ALLOWED_MIME_TYPES.document,
  ...ALLOWED_MIME_TYPES.video,
  ...ALLOWED_MIME_TYPES.audio,
];

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let resource_type = "auto";

    if (ALLOWED_MIME_TYPES.document.includes(file.mimetype)) {
      resource_type = "raw";
    } else if (ALLOWED_MIME_TYPES.video.includes(file.mimetype)) {
      resource_type = "video";
    } else if (ALLOWED_MIME_TYPES.audio.includes(file.mimetype)) {
      resource_type = "video"; // Cloudinary treats audio as video
    }

    return {
      folder: "audit-proofs",
      public_id: `proof_${Date.now()}_${Math.round(Math.random() * 1e9)}`,
      resource_type,
      allowed_formats: [
        "jpg",
        "png",
        "gif",
        "webp",
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "txt",
        "csv",
        "mp4",
        "mpeg",
        "avi",
        "webm",
        "mp3",
        "wav",
        "ogg",
      ],
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = getAllowedMimeTypes();
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Only images, documents, videos, and audio are allowed.`
      )
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  fileFilter,
});

export default upload;
