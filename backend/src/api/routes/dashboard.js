// backend/src/api/routes/dashboard.js
const express = require('express');
const dashboardService = require('../../services/dashboardService');
const { admin } = require('../../config/firebase');
const authService = require('../../services/authService');

const router = express.Router();

// Middleware para verificar token de Firebase Auth
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar que el usuario es dueño del restaurante
const verifyOwner = async (req, res, next) => {
    try {
      const restaurantData = await authService.getRestaurantByUserUid(req.user.uid);
      if (restaurantData.restaurantId !== req.params.restaurantId) {
        return res.status(403).json({ error: 'No autorizado para acceder a este restaurante' });
      }
      req.restaurantId = restaurantData.restaurantId;
      next();
    } catch (error) {
      console.error('Error en middleware verifyOwner:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };

// GET /api/dashboard/:restaurantId/stats
router.get('/:restaurantId/stats', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const stats = await dashboardService.getDashboardStats(restaurantId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
