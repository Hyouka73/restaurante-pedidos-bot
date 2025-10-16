// backend/src/api/routes/config.js
const express = require('express');
const configService = require('../../services/configService');
const authService = require('../../services/authService'); // Para verificar ownership
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
    // Agregamos el restaurantId del usuario al request para verificar ownership
    const userDoc = await require('firebase-admin').firestore().collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuario no encontrado en la base de datos.' });
    }
    req.restaurantId = userDoc.data().restaurantId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// GET /api/config/:restaurantId/messages
router.get('/:restaurantId/messages', verifyToken, async (req, res) => {
  try {
    // Verificar que el usuario sea dueño del restaurante
    if (req.restaurantId !== req.params.restaurantId) {
      return res.status(403).json({ error: 'No autorizado para ver esta configuración.' });
    }
    const messages = await configService.getMessages(req.params.restaurantId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/messages
router.put('/:restaurantId/messages', verifyToken, async (req, res) => {
  try {
    // Verificar que el usuario sea dueño del restaurante
    if (req.restaurantId !== req.params.restaurantId) {
      return res.status(403).json({ error: 'No autorizado para actualizar esta configuración.' });
    }
    await configService.updateMessages(req.params.restaurantId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/config/:restaurantId/general (Obtener configuración general del restaurante)
router.get('/:restaurantId/general', verifyToken, async (req, res) => {
  try {
    if (req.restaurantId !== req.params.restaurantId) {
      return res.status(403).json({ error: 'No autorizado para ver esta configuración.' });
    }
    const config = await authService.getRestaurantByUserUid(req.user.uid);
    // Devolver solo la información general, no todo el objeto
    const { info, hours, availabilitySettings, delivery, paymentMethods, features, commands } = config;
    res.json({ info, hours, availabilitySettings, delivery, paymentMethods, features, commands });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/general (Actualizar configuración general del restaurante)
router.put('/:restaurantId/general', verifyToken, async (req, res) => {
  try {
    if (req.restaurantId !== req.params.restaurantId) {
      return res.status(403).json({ error: 'No autorizado para actualizar esta configuración.' });
    }
    await authService.updateRestaurantInfo(req.params.restaurantId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;