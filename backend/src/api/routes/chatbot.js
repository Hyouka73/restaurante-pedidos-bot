// backend/src/api/routes/chatbot.js
const express = require('express');
const router = express.Router();
const botController = require('../controllers/botController');

// Nota: Por ahora no hay middleware de autenticación, ya que estos endpoints son llamados por el propio bot,
// que podría no tener una sesión de usuario. La seguridad podría manejarse con un token secreto
// pasado desde el bot si fuera necesario en el futuro.

// POST /api/chatbot/get-recommendation
router.post('/get-recommendation', botController.getRecommendation);

// POST /api/chatbot/get-combo-components
router.post('/get-combo-components', botController.getComboComponents);

// POST /api/chatbot/get-cross-sell
router.post('/get-cross-sell', botController.getCrossSell);

module.exports = router;
