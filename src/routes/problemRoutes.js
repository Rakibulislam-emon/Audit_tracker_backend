import { Router } from 'express';
import * as problemController from '../controllers/problemController.js';

const router = Router();

router.get('/', problemController.getAllProblems);
router.get('/:id', problemController.getProblemById);
router.post('/', problemController.createProblem);
router.put('/:id', problemController.updateProblem);
router.delete('/:id', problemController.deleteProblem);

export default router;