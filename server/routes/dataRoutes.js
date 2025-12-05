const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/dashboard', dataController.getDashboardData);
router.get('/devices', dataController.getDevices);

module.exports = router;
