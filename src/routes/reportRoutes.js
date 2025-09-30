import { Router } from 'express';
import * as reportController from '../controllers/reportController.js';

const router = Router();

// Basic CRUD routes
router.get('/', reportController.getAllReports);
router.get('/:id', reportController.getReportById);
router.post('/', reportController.createReport);
router.post('/generate', reportController.generateReport); // Auto-generate from audit session
router.put('/:id', reportController.updateReport);
router.delete('/:id', reportController.deleteReport);

// Additional routes
router.get('/audit-session/:auditSessionId', reportController.getReportsByAuditSession);
router.patch('/:id/status', reportController.updateReportStatus);

// Report statistics
router.get('/statistics/overview', reportController.getReportStatistics);

export default router;