const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { stats } = require('../controllers/dashboard.controller');

const router = Router();
router.use(authenticate);

router.get('/', stats);

module.exports = router;
