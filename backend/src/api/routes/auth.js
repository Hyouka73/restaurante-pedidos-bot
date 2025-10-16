// backend/src/api/routes/auth.js
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
    // Agregamos el restaurantId del usuario al request
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

// GET /api/auth/profile - Obtener perfil del usuario y restaurante
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const profile = await authService.getRestaurantByUserUid(req.user.uid);
    // Devolver información del usuario y del restaurante
    res.json({
      user: {
        uid: req.user.uid,
        email: req.user.email,
        displayName: req.user.displayName,
      },
      restaurant: profile
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/profile - Actualizar perfil del restaurante (info básica)
// Este endpoint ahora se enfoca en info del restaurante, no del usuario de Firebase Auth
// Para cosas como nombre, descripción, teléfono, dirección, etc.
router.put('/profile', verifyToken, async (req, res) => {
  try {
    // Solo actualiza la subsección 'info' del restaurante
    const updateData = { info: req.body };
    await authService.updateRestaurantInfo(req.restaurantId, updateData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/link-telegram-token (Endpoint para enlazar el token del bot desde el panel)
// ESTE ES EL NUEVO ENDPOINT para manejar la lógica de enlazar un token de bot
router.post('/link-telegram-token', verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token de bot es requerido.' });
    }

    // Aquí iría la lógica para verificar el token con la API de Telegram
    // Por ejemplo, usar Telegraf para hacer un getMe()
    const { Telegraf } = require('telegraf');
    const tempBot = new Telegraf(token);
    try {
      await tempBot.telegram.getMe(); // Esto fallará si el token es inválido
      // Si no falla, el token es válido
      // Aquí puedes guardar el token (o un hash) en Firestore asociado al restaurante
      // Por ejemplo: db.collection('restaurants').doc(req.restaurantId).update({ telegramBotTokenHash: hash(token) })
      // Por ahora, solo confirmamos que es válido
      res.json({ success: true, message: 'Token de bot verificado exitosamente.' });
    } catch (telegramError) {
      console.error('Error verificando token de bot:', telegramError);
      return res.status(400).json({ error: 'Token de bot inválido o no autorizado.' });
    }

  } catch (error) {
    console.error('Error en link-telegram-token:', error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;