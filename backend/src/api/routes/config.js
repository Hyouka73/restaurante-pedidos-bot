// backend/src/api/routes/config.js
const express = require('express');
const availabilityService = require('../../services/availabilityService');
const configService = require('../../services/configService'); // Importar configService
const authService = require('../../services/authService'); // Importar authService para verificación de dueño
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

// GET /api/config/:restaurantId/general
router.get('/:restaurantId/general', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    // CORREGIDO: Usar configService en lugar de authService
    const config = await configService.getGeneralInfo(restaurantId);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/config/:restaurantId/today-schedule
router.get('/:restaurantId/today-schedule', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const schedule = await availabilityService.getTodaySchedule(restaurantId);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/general
router.put('/:restaurantId/general', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const updateData = req.body;
    // CORREGIDO: Usar configService en lugar de authService
    const updated = await configService.updateGeneralInfo(restaurantId, updateData);
    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/bot-token
router.put('/:restaurantId/bot-token', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { token } = req.body;
    // CORREGIDO: Usar configService en lugar de authService
    await configService.updateTelegramToken(restaurantId, token);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/config/:restaurantId/validate-bot-token
router.post('/:restaurantId/validate-bot-token', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    // Obtener token encriptado desde Firestore
    const doc = await require('../../config/firebase').db.collection('restaurants').doc(restaurantId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Restaurante no encontrado' });
    const data = doc.data();
    const enc = data?.info?.telegramToken;
    if (!enc) return res.status(400).json({ error: 'Token no configurado' });

    const cryptoUtils = require('../../utils/crypto');
    let token;
    try {
      token = cryptoUtils.decryptToken(enc);
    } catch (err) {
      console.error('Error decrypting token:', err);
      return res.status(500).json({ error: 'Error decrypting token' });
    }

    // Validar token con Telegram
    const { Telegraf } = require('telegraf');
    const bot = new Telegraf(token);
    try {
      const me = await bot.telegram.getMe();
      res.json({ success: true, botInfo: me });
    } catch (err) {
      console.error('Error validating bot token:', err);
      res.status(400).json({ error: 'Token inválido o no autorizado', details: err.message });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/mark-setup-completed
router.put('/:restaurantId/mark-setup-completed', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    // CORREGIDO: Usar configService en lugar de authService
    await configService.markSetupAsCompleted(restaurantId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/availability (Ejemplo para actualizar disponibilidad manual)
router.put('/:restaurantId/availability', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { status, reason } = req.body;
    // CORREGIDO: Usar configService en lugar de authService
    await configService.updateAvailability(restaurantId, status, reason, req.user.uid); // Pasar UID del usuario
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/availability-settings (Ejemplo)
router.put('/:restaurantId/availability-settings', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const settings = req.body;
    // CORREGIDO: Usar configService en lugar de authService
    await configService.updateAvailabilitySettings(restaurantId, settings);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/hours (Ejemplo)
router.put('/:restaurantId/hours', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const hours = req.body;
    // CORREGIDO: Usar configService en lugar de authService
    await configService.updateHours(restaurantId, hours);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/delivery (Ejemplo)
router.put('/:restaurantId/delivery', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const delivery = req.body;
    // CORREGIDO: Usar configService en lugar de authService
    await configService.updateDeliverySettings(restaurantId, delivery);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/payment-methods (Ejemplo)
router.put('/:restaurantId/payment-methods', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const paymentMethods = req.body;
    // CORREGIDO: Usar configService en lugar de authService
    await configService.updatePaymentMethods(restaurantId, paymentMethods);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/features (Ejemplo)
router.put('/:restaurantId/features', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const features = req.body;
    // CORREGIDO: Usar configService en lugar de authService
    await configService.updateFeatures(restaurantId, features);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/commands (Ejemplo)
router.put('/:restaurantId/commands', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const commands = req.body;
    // CORREGIDO: Usar configService en lugar de authService
    await configService.updateCommands(restaurantId, commands);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/config/:restaurantId/messages
router.get('/:restaurantId/messages', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const messages = await configService.getMessages(restaurantId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DEV-only: GET debug info about stored telegram token (no plaintext returned)
router.get('/:restaurantId/_debug-telegram-token', verifyToken, verifyOwner, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Debug endpoint disabled in production' });
    }

    const { restaurantId } = req.params;
    const docRef = require('../../config/firebase').db.collection('restaurants').doc(restaurantId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Restaurante no encontrado' });
    const data = doc.data();
    const enc = data?.info?.telegramToken;
    if (!enc) return res.json({ present: false, message: 'No token stored' });

    const isBase64 = (() => {
      try {
        Buffer.from(enc, 'base64');
        return true;
      } catch (_) {
        return false;
      }
    })();

    const decodedLen = isBase64 ? Buffer.from(enc, 'base64').length : null;

    // Attempt decryption and capture error (but never return plaintext)
    const cryptoUtils = require('../../utils/crypto');
    let decryptOk = false;
    let decryptError = null;
    try {
      // we do not keep or return the plaintext, only mark success
      const plain = cryptoUtils.decryptToken(enc);
      decryptOk = true;
      // ensure we don't accidentally leak the token
      void plain;
    } catch (err) {
      decryptError = err && err.message ? err.message : String(err);
      console.error('[debug-telegram-token] decrypt error:', err);
    }

    return res.json({
      present: true,
      isBase64,
      decodedLen,
      decryptOk,
      decryptError
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/messages
router.put('/:restaurantId/messages', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const messages = req.body;
    await configService.updateMessages(restaurantId, messages);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/config/:restaurantId/notifications
router.get('/:restaurantId/notifications', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const settings = await configService.getNotificationSettings(restaurantId);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/config/:restaurantId/notifications
router.put('/:restaurantId/notifications', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const settings = req.body;
    await configService.updateNotificationSettings(restaurantId, settings);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- RUTAS AÑADIDAS PARA HABILITAR/DESHABILITAR EL BOT ---

// POST /api/config/:restaurantId/bot-enable
router.post('/:restaurantId/bot-enable', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const result = await configService.enableBot(restaurantId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/config/:restaurantId/bot-disable
router.post('/:restaurantId/bot-disable', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const result = await configService.disableBot(restaurantId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;