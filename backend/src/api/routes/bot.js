// backend/src/api/routes/bot.js
const express = require('express');
const router = express.Router();
const botService = require('../../services/botService');
const { verifyToken, verifyOwner } = require('../middleware/auth');

// POST /api/bot/:restaurantId/start
router.post('/:restaurantId/start', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { webhook_url } = req.body; // opcional

    await botService.initBot(restaurantId);
    
    if (webhook_url) {
      await botService.configureWebhook(restaurantId, webhook_url);
    }

    const status = await botService.getStatus(restaurantId);
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error iniciando bot:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bot/:restaurantId/stop
router.post('/:restaurantId/stop', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const stopped = await botService.stopBot(restaurantId);
    res.json({ success: true, stopped });
  } catch (error) {
    console.error('Error deteniendo bot:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bot/:restaurantId/status
router.get('/:restaurantId/status', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const status = await botService.getStatus(restaurantId);
    res.json(status);
  } catch (error) {
    console.error('Error obteniendo estado del bot:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bot/:restaurantId/webhook
router.post('/:restaurantId/webhook', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { url } = req.body;
    
    await botService.configureWebhook(restaurantId, url);
    const status = await botService.getStatus(restaurantId);
    res.json({ success: true, status });
  } catch (error) {
    console.error('Error configurando webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;