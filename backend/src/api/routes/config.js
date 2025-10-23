// backend/src/api/routes/config.js
const express = require('express');
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

// PUT /api/config/:restaurantId/general
router.put('/:restaurantId/general', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const updateData = req.body;
    // CORREGIDO: Usar configService en lugar de authService
    await configService.updateGeneralInfo(restaurantId, updateData);
    res.json({ success: true });
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

// PUT /api/config/:restaurantId/messages
router.put('/:restaurantId/messages', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const messages = req.body;
    // CORREGIDO: Usar configService en lugar de authService
    await configService.updateMessages(restaurantId, messages);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;