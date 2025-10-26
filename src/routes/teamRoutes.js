// src/routes/teamRoutes.js

import { Router } from 'express';
import * as teamController from '../controllers/teamController.js';
import auth from '../middleware/auth.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = Router();

// --- Team Assignment Routes ---
// Adjust roles based on dynamicConfig permissions for 'teams'

router.get('/', auth, authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), teamController.getAllTeams);
router.get('/:id', auth, authorizeRoles("admin", "sysadmin", "audit_manager", "auditor"), teamController.getTeamById);
router.post('/', auth, authorizeRoles("admin", "sysadmin", "audit_manager"), teamController.createTeam);
router.patch('/:id', auth, authorizeRoles("admin", "sysadmin", "audit_manager"), teamController.updateTeam);
router.delete('/:id', auth, authorizeRoles("admin", "sysadmin", "audit_manager"), teamController.deleteTeam);

export default router;