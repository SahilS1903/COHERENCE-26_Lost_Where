const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/edge.controller');

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/:workflowId/edges', ctrl.list);
router.post('/:workflowId/edges', ctrl.create);
router.delete('/:workflowId/edges/:id', ctrl.remove);

module.exports = router;
