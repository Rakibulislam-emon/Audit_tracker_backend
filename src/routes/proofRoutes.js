// src/routes/proofRoutes.js
import { Router } from 'express';
import * as proofController from '../controllers/proofController.js';
import upload from '../middleware/upload.js';
const router = Router();

router.get('/', proofController.getAllProofs);
router.get('/:id', proofController.getProofById);
router.post('/', upload.single('file'), proofController.uploadProof);
router.put('/:id', proofController.updateProof);
router.delete('/:id', proofController.deleteProof);

export default router;