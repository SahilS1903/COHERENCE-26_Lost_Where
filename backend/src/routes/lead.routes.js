const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/lead.controller');

const router = Router({ mergeParams: true });
router.use(authenticate);

// Debug logging for lead routes
router.use((req, res, next) => {
  console.log('[lead.routes] Hit with path:', req.path, 'Method:', req.method);
  console.log('[lead.routes] Params:', req.params);
  console.log('[lead.routes] Full URL:', req.originalUrl);
  next();
});

// Test route to verify mounting
router.get('/test-lead-routes', (req, res) => {
  res.json({ message: 'Lead routes are working!' });
});

// Workflow-scoped
router.post('/:workflowId/leads/import', ctrl.bulkImport);
router.post('/:workflowId/leads/upload-file', ctrl.upload.single('file'), ctrl.uploadFile);
router.get('/:workflowId/leads', ctrl.list);

// Lead-scoped (mounted at /api/leads)
router.get('/:id', ctrl.getOne);
router.patch('/:id/status', ctrl.updateStatus);
router.get('/:id/history', ctrl.getHistory);

module.exports = router;
