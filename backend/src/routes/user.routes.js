const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/user.controller');

const router = Router();
router.use(authenticate);

router.get('/smtp-config', ctrl.getSmtpConfig);
router.put('/smtp-config', ctrl.updateSmtpConfig);
router.delete('/smtp-config', ctrl.deleteSmtpConfig);
router.post('/smtp-config/test', ctrl.testSmtpConfig);

module.exports = router;
