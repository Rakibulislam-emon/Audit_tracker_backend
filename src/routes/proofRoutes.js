// src/routes/proofRoutes.js
import { Router } from "express";
import { can } from "../config/permissions.js";
import * as proofController from "../controllers/proofController.js";
import auth from "../middleware/auth.js";
import authorizeRoles from "../middleware/authorizeRoles.js";
import upload from "../middleware/upload.js";

const router = Router();

// GET /api/proofs - View All Proofs
router.get(
  "/",
  auth,
  authorizeRoles(...can("PROOF", "VIEW")),
  proofController.getAllProofs
);

// GET /api/proofs/:id - View Single Proof
router.get(
  "/:id",
  auth,
  authorizeRoles(...can("PROOF", "VIEW")),
  proofController.getProofById
);

// POST /api/proofs - Upload New Proof
router.post(
  "/",
  auth,
  authorizeRoles(...can("PROOF", "CREATE")),
  upload.single("file"),
  proofController.uploadProof
);

// PATCH /api/proofs/:id - Update Proof Caption/Status
router.patch(
  "/:id",
  auth,
  authorizeRoles(...can("PROOF", "UPDATE")),
  proofController.updateProof
);

// DELETE /api/proofs/:id - Delete Proof
router.delete(
  "/:id",
  auth,
  authorizeRoles(...can("PROOF", "DELETE")),
  proofController.deleteProof
);

export default router;