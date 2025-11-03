// backend/src/api/routes/orders.js
const express = require('express');
const orderService = require('../../services/orderService');
const { verifyTokenAndOwner } = require('../middleware/auth');

const router = express.Router();

// GET /api/orders/:restaurantId
router.get('/:restaurantId', verifyTokenAndOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const statusFilter = req.query.status || null; // Filtro opcional por estado
    const orders = await orderService.getOrders(restaurantId, statusFilter);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/orders/:restaurantId/:orderId/status
router.put('/:restaurantId/:orderId/status', verifyTokenAndOwner, async (req, res) => {
  try {
    const { restaurantId, orderId } = req.params;
    const { newStatus, notes } = req.body;

    await orderService.updateOrderStatus(restaurantId, orderId, newStatus, { notes });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/orders/:restaurantId/:orderId (Obtener un pedido específico)
router.get('/:restaurantId/:orderId', verifyTokenAndOwner, async (req, res) => {
  try {
    const { restaurantId, orderId } = req.params;
    const order = await orderService.getOrder(restaurantId, orderId);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;