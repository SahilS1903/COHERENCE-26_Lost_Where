const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/node.controller');

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get('/:workflowId/nodes', ctrl.list);
router.post('/:workflowId/nodes', ctrl.create);
router.get('/:workflowId/nodes/:id', ctrl.getOne);
router.put('/:workflowId/nodes/:id', ctrl.update);
router.delete('/:workflowId/nodes/:id', ctrl.remove);

module.exports = router;
