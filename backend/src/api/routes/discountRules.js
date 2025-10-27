// backend/src/api/routes/discountRules.js
const express = require('express');
const router = express.Router();
const discountRuleController = require('../controllers/discountRuleController');
const authMiddleware = require('../middleware/auth'); // Proteger las rutas

// Todas las rutas aquí están protegidas y requieren autenticación
router.use(authMiddleware);

router.get('/', discountRuleController.getRules);
router.post('/', discountRuleController.createRule);
router.put('/:ruleId', discountRuleController.updateRule);
router.delete('/:ruleId', discountRuleController.deleteRule);

module.exports = router;
