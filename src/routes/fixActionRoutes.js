import { Router } from 'express';
import * as fixActionController from '../controllers/fixActionController.js';

const router = Router();

router.get('/', fixActionController.getAllFixActions);
router.get('/:id', fixActionController.getFixActionById);
router.post('/', fixActionController.createFixAction);
router.put('/:id', fixActionController.updateFixAction);
router.delete('/:id', fixActionController.deleteFixAction);

export default router;