import { Router } from 'express';
import * as metricController from '../controllers/metricController.js';

const router = Router();

// Basic CRUD routes
router.get('/', metricController.getAllMetrics);
router.get('/:id', metricController.getMetricById);
router.post('/', metricController.createMetric);
router.put('/:id', metricController.updateMetric);
router.delete('/:id', metricController.deleteMetric);

// Special routes
router.get('/audit-session/:auditSessionId', metricController.getMetricsByAuditSession);
router.get('/audit-session/:auditSessionId/dashboard', metricController.getDashboardMetrics);
router.get('/audit-session/:auditSessionId/statistics', metricController.getMetricStatistics);
router.post('/bulk', metricController.bulkCreateMetrics);
router.post('/calculate-from-audit', metricController.calculateMetricsFromAudit);

export default router;