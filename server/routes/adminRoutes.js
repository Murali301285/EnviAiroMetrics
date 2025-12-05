const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const locationController = require('../controllers/locationController');
const dataController = require('../controllers/dataController');
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// Protect all routes
router.use(authenticateToken);

// User Management (Admin only)
router.get('/users', requireAdmin, adminController.getUsers);
router.post('/users', requireAdmin, adminController.createUser);
router.put('/users/:id', requireAdmin, adminController.updateUser);
router.delete('/users/:id', requireAdmin, adminController.deleteUser);

// App Management
router.get('/apps', adminController.getApps); // Accessible by all authenticated users (filtered in controller)
router.post('/apps', requireAdmin, adminController.createApp);
router.put('/apps/:id', requireAdmin, adminController.updateApp);
router.delete('/apps/:id', requireAdmin, adminController.deleteApp);

// Location Management (Admin only)
router.get('/locations', requireAdmin, locationController.getLocations);
router.post('/locations', requireAdmin, locationController.createLocation);
router.put('/locations/:id', requireAdmin, locationController.updateLocation);
router.delete('/locations/:id', requireAdmin, locationController.deleteLocation);

// Dashboard Data (Using new controller)
router.get('/data/dashboard', dashboardController.getDashboardData);
router.get('/data/devices', dataController.getDevices);

module.exports = router;
