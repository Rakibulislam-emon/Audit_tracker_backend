// src/routes/questionRoutes.js

import { Router } from 'express';
import * as questionController from '../controllers/questionController.js';

const router = Router();

router.get('/', questionController.getAllQuestions);
router.get('/:id', questionController.getQuestionById);
router.post('/', questionController.createQuestion);
router.put('/:id', questionController.updateQuestion);
router.delete('/:id', questionController.deleteQuestion);

export default router;