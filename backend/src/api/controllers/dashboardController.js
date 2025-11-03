// backend/src/api/controllers/dashboardController.js
const dashboardService = require('../../services/dashboardService');

async function getProjectionStatus(req, res) {
  try {
    const { restaurantId } = req.params;
    const status = await dashboardService.getProjectionStatus(restaurantId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getProjectionData(req, res) {
  try {
    const { restaurantId } = req.params;
    const data = await dashboardService.getProjectionData(restaurantId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getProjectionStatus,
  getProjectionData,
};
