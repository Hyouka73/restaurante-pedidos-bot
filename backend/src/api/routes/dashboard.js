// backend/src/api/routes/dashboard.js
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { verifyTokenAndOwner } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/:restaurantId/stats
router.get('/:restaurantId/stats', verifyTokenAndOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const dashboardService = require('../../services/dashboardService');
    const stats = await dashboardService.getDashboardStats(restaurantId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/projection-status/:restaurantId
router.get('/projection-status/:restaurantId', verifyTokenAndOwner, dashboardController.getProjectionStatus);

// GET /api/dashboard/projection-data/:restaurantId
router.get('/projection-data/:restaurantId', verifyTokenAndOwner, dashboardController.getProjectionData);

module.exports = router;

