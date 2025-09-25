// src/routes/siteRoutes.js

import { Router } from 'express';
import * as siteController from '../controllers/siteController.js';

const router = Router();

router.get('/', siteController.getAllSites);
router.get('/:id', siteController.getSiteById);
router.post('/', siteController.createSite);
router.put('/:id', siteController.updateSite);
router.delete('/:id', siteController.deleteSite);

export default router;