const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { list } = require('../controllers/outbox.controller');

const router = Router();
router.use(authenticate);

router.get('/', list);

module.exports = router;
