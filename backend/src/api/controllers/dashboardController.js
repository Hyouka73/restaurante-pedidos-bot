// backend/src/api/controllers/dashboardController.js
const dashboardService = require('../../services/dashboardService');

async function getProjectionStatus(req, res) {
  try {
    const { restaurantId } = req.params;
    const status = await dashboardService.getProjectionStatus(restaurantId);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getProjectionData(req, res) {
  try {
    const { restaurantId } = req.params;
    const data = await dashboardService.getProjectionData(restaurantId);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getDashboardStats(req, res) {
  try {
    const { restaurantId } = req.params;
    const stats = await dashboardService.getDashboardStats(restaurantId);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getProjectionStatus,
  getProjectionData,
  getDashboardStats,
};
