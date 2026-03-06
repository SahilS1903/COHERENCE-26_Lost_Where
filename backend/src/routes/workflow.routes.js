const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/workflow.controller');

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.patch('/:id/activate', ctrl.activate);
router.patch('/:id/deactivate', ctrl.deactivate);

module.exports = router;
