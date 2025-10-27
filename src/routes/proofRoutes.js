// src/routes/proofRoutes.js
import { Router } from "express";
import * as proofController from "../controllers/proofController.js";
// ✅ Middleware Imports (without curly braces)
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import upload from "../middleware/upload.js"; // Assuming your multer/cloudinary upload middleware is here

const router = Router();

// --- Proof Routes ---
// Adjust roles as needed

// GET /api/proofs - View All Proofs
router.get(
  "/",
  auth,
  // Who can view proofs? Probably anyone involved in the audit.
  authorizeRoles(
    "admin",
    "sysadmin",
    "audit_manager",
    "auditor",
    "compliance_officer"
  ),
  proofController.getAllProofs
);

// GET /api/proofs/:id - View Single Proof
router.get(
  "/:id",
  auth,
  authorizeRoles(
    "admin",
    "sysadmin",
    "audit_manager",
    "auditor",
    "compliance_officer"
  ),
  proofController.getProofById
);

// POST /api/proofs - Upload New Proof
router.post(
  "/",
  auth,
  // Who can upload proof? Auditors, Owners of FixActions, Managers?
  authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), // Broad access initially
  upload.single("file"), // ✅ Use multer middleware to handle single file upload named 'file'
  proofController.uploadProof
);

// PATCH /api/proofs/:id - Update Proof Caption/Status
router.patch(
  // Use PATCH for partial updates
  "/:id",
  auth,
  // Who can update caption/status? Uploader? Manager?
  authorizeRoles("admin", "sysadmin", "audit_manager"), // More restricted update?
  proofController.updateProof
);

// DELETE /api/proofs/:id - Delete Proof (Restricted)
router.delete(
  "/:id",
  auth,
  authorizeRoles("admin", "sysadmin", "audit_manager"), // Manager/Admin can delete proof
  proofController.deleteProof
);

export default router;
