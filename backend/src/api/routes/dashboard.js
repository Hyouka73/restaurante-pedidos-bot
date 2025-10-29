// backend/src/api/routes/dashboard.js
const express = require('express');
const dashboardService = require('../../services/dashboardService');
const { verifyTokenAndOwner } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/:restaurantId/stats
router.get('/:restaurantId/stats', verifyTokenAndOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const stats = await dashboardService.getDashboardStats(restaurantId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
