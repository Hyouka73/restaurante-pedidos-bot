// backend/src/api/routes/discountRules.js
const express = require('express');
const router = express.Router();
const discountRuleController = require('../controllers/discountRuleController');
const { verifyTokenAndOwner } = require('../middleware/auth');

// ✅ CORRECCIÓN: Todas las rutas ahora incluyen restaurantId
// y usan verifyTokenAndOwner para verificar permisos

// GET /api/discount-rules/:restaurantId
router.get('/:restaurantId', verifyTokenAndOwner, discountRuleController.getRules);

// POST /api/discount-rules/:restaurantId
router.post('/:restaurantId', verifyTokenAndOwner, discountRuleController.createRule);

// PUT /api/discount-rules/:restaurantId/:ruleId
router.put('/:restaurantId/:ruleId', verifyTokenAndOwner, discountRuleController.updateRule);

// DELETE /api/discount-rules/:restaurantId/:ruleId
router.delete('/:restaurantId/:ruleId', verifyTokenAndOwner, discountRuleController.deleteRule);

module.exports = router;