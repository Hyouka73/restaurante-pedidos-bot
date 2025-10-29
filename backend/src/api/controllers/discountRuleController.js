// backend/src/api/controllers/discountRuleController.js
const DiscountRuleService = require('../../services/discountRuleService');

const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ✅ CORRECCIÓN: Obtener restaurantId de req.params
exports.getRules = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const rules = await DiscountRuleService.getDiscountRules(restaurantId);
  res.status(200).json(rules);
});

exports.createRule = asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  const { success, id } = await DiscountRuleService.createDiscountRule(restaurantId, req.body);
  if (success) {
    res.status(201).json({ message: 'Regla creada con éxito', id });
  }
});

exports.updateRule = asyncHandler(async (req, res) => {
  const { restaurantId, ruleId } = req.params;
  await DiscountRuleService.updateDiscountRule(restaurantId, ruleId, req.body);
  res.status(200).json({ message: 'Regla actualizada con éxito' });
});

exports.deleteRule = asyncHandler(async (req, res) => {
  const { restaurantId, ruleId } = req.params;
  await DiscountRuleService.deleteDiscountRule(restaurantId, ruleId);
  res.status(200).json({ message: 'Regla eliminada con éxito' });
});