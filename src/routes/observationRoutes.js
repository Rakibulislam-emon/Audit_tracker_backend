import { Router } from 'express';
import * as observationController from '../controllers/observationController.js';

const router = Router();

router.get('/', observationController.getAllObservations);
router.get('/:id', observationController.getObservationById);
router.post('/', observationController.createObservation);
router.put('/:id', observationController.updateObservation);
router.delete('/:id', observationController.deleteObservation);

export default router;