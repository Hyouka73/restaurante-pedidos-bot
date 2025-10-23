// backend/src/api/middleware/auth.js
const { admin } = require('../../config/firebase');
const authService = require('../../services/authService');

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
    console.error("Error verificando token:", error);
    res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar que el usuario es dueño del restaurante
const verifyOwner = async (req, res, next) => {
  try {
    const restaurantData = await authService.getRestaurantByUserUid(req.user.uid);
    console.log('[verifyOwner] Comparando IDs:', {
      fromURL: req.params.restaurantId,
      fromDB: restaurantData.restaurantId,
      userUID: req.user.uid
    });
    if (restaurantData.restaurantId !== req.params.restaurantId) {
      return res.status(403).json({ error: 'No autorizado para acceder a este restaurante' });
    }
    req.restaurantId = restaurantData.restaurantId; // Pasar el ID a los handlers
    next();
  } catch (error) {
    console.error('Error en middleware verifyOwner:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  verifyToken,
  verifyOwner
};