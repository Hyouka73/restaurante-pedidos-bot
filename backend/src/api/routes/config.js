const express = require('express');
const configService = require('../../services/configService');

const router = express.Router();

// GET /api/config/:restaurantId/messages
router.get('/:restaurantId/messages', async (req, res) => {
  try {
    const messages = await configService.getMessages(req.params.restaurantId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/messages
router.put('/:restaurantId/messages', async (req, res) => {
  try {
    await configService.updateMessages(req.params.restaurantId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
