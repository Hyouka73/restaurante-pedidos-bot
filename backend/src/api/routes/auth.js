const express = require('express');
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

// GET /api/auth/profile - Obtener perfil del usuario y restaurante
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const profile = await authService.getRestaurantByUserUid(req.user.uid);
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/profile - Actualizar perfil del restaurante
router.put('/profile', verifyToken, async (req, res) => {
  try {
    await authService.updateRestaurantInfo(req.user.restaurantId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
