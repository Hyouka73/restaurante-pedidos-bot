// backend/src/api/routes/dashboard.js
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { verifyTokenAndOwner } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/:restaurantId/stats
router.get('/:restaurantId/stats', verifyTokenAndOwner, dashboardController.getDashboardStats);

// GET /api/dashboard/projection-status/:restaurantId
router.get('/projection-status/:restaurantId', verifyTokenAndOwner, dashboardController.getProjectionStatus);

// GET /api/dashboard/projection-data/:restaurantId
router.get('/projection-data/:restaurantId', verifyTokenAndOwner, dashboardController.getProjectionData);

module.exports = router;

