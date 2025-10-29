// backend/src/api/routes/qr.js
const express = require('express');
const router = express.Router();
const qrService = require('../../services/qrService');
const { verifyTokenAndOwner } = require('../middleware/auth');

// GET /api/qr/:restaurantId - Generar QR
router.get('/:restaurantId', verifyTokenAndOwner, async (req, res) => {
  const { restaurantId } = req.params;
  
  try {
    if (!restaurantId) {
      return res.status(400).json({ 
        error: 'ID de restaurante requerido' 
      });
    }

    // Validar bot config
    const botConfig = await qrService.validateBotConfig();
    
    if (!botConfig.valid) {
      console.error('❌ Bot config inválido:', botConfig.error);
      return res.status(500).json({ 
        error: 'Configuración del bot incompleta',
        details: botConfig.error
      });
    }

    // Generar QR
    const qrData = await qrService.generateRestaurantQr(restaurantId);
    
    res.json({
      success: true,
      ...qrData
    });

  } catch (error) {
    console.error('❌ Error ruta QR:', error.message);
    
    const statusCode = error.message.includes('no encontrado') ? 404 : 500;
    
    res.status(statusCode).json({ 
      success: false,
      error: error.message
    });
  }
});

// GET /api/qr/validate/config - Validar config del bot
router.get('/validate/config', verifyTokenAndOwner, async (req, res) => {
  try {
    const validation = await qrService.validateBotConfig();
    res.json(validation);
  } catch (error) {
    res.status(500).json({ 
      valid: false,
      error: error.message 
    });
  }
});

module.exports = router;