// backend/src/api/routes/orders.js
const express = require('express');
const orderService = require('../../services/orderService');
const authService = require('../../services/authService');
const { admin } = require('../../config/firebase'); // Para verificar el token de Firebase Auth

const router = express.Router();

// Middleware para verificar token de Firebase Auth
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Agrega los datos del usuario al request
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// GET /api/orders/:restaurantId
router.get('/:restaurantId', verifyToken, async (req, res) => {
  try {
    // Verificar que el usuario sea el dueño del restaurante
    const { restaurantId } = req.params;
    const restaurantData = await authService.getRestaurantByUserUid(req.user.uid);
    if (restaurantData.restaurantId !== restaurantId) {
      return res.status(403).json({ error: 'No autorizado para ver estos pedidos' });
    }

    const statusFilter = req.query.status || null; // Filtro opcional por estado
    const orders = await orderService.getOrders(restaurantId, statusFilter);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/orders/:restaurantId/:orderId/status
router.put('/:restaurantId/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { restaurantId, orderId } = req.params;
    const { newStatus, notes } = req.body;

    // Verificar que el usuario sea el dueño del restaurante
    const restaurantData = await authService.getRestaurantByUserUid(req.user.uid);
    if (restaurantData.restaurantId !== restaurantId) {
      return res.status(403).json({ error: 'No autorizado para actualizar este pedido' });
    }

    await orderService.updateOrderStatus(restaurantId, orderId, newStatus, notes);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/orders/:restaurantId/:orderId (Obtener un pedido específico)
router.get('/:restaurantId/:orderId', verifyToken, async (req, res) => {
  try {
    const { restaurantId, orderId } = req.params;

    // Verificar que el usuario sea el dueño del restaurante
    const restaurantData = await authService.getRestaurantByUserUid(req.user.uid);
    if (restaurantData.restaurantId !== restaurantId) {
      return res.status(403).json({ error: 'No autorizado para ver este pedido' });
    }

    const order = await orderService.getOrder(restaurantId, orderId);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;