// backend/src/routes/menu.js
const express = require('express');
const router = express.Router();
const menuService = require('../services/menuService');
const authService = require('../services/authService'); // Importamos authService para verificación de dueño
const { verifyToken } = require('../middleware/auth'); // Importamos middleware de autenticación

// Middleware para verificar que el usuario es dueño del restaurante
const verifyOwner = async (req, res, next) => {
  try {
    const restaurantData = await authService.getRestaurantByUserUid(req.user.uid);
    if (restaurantData.restaurantId !== req.params.restaurantId) {
      return res.status(403).json({ error: 'No autorizado para acceder a este menú' });
    }
    next();
  } catch (error) {
    console.error('Error en middleware verifyOwner:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// --- RUTAS PARA ITEMS ---
// GET /api/menu/:restaurantId/items
router.get('/:restaurantId/items', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const items = await menuService.getMenuItems(restaurantId);
    res.json(items);
  } catch (error) {
    console.error('Error al obtener items:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/menu/:restaurantId/items/:itemId
router.get('/:restaurantId/items/:itemId', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;
    const item = await menuService.getMenuItem(restaurantId, itemId);
    res.json(item);
  } catch (error) {
    console.error('Error al obtener item:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/menu/:restaurantId/items
router.post('/:restaurantId/items', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const itemData = req.body;
    // Validaciones básicas
    if (!itemData.name || itemData.price === undefined) {
        return res.status(400).json({ error: 'Nombre y precio son obligatorios' });
    }
    const result = await menuService.createMenuItem(restaurantId, itemData);
    res.json(result);
  } catch (error) {
    console.error('Error al crear item:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/menu/:restaurantId/items/:itemId
router.put('/:restaurantId/items/:itemId', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;
    const itemData = req.body;
    // Validaciones básicas
    if (itemData.name && itemData.price === undefined) { // Si se intenta actualizar el nombre, el precio también debe estar
        if (itemData.price === undefined) {
            return res.status(400).json({ error: 'Precio es obligatorio si se actualiza el nombre' });
        }
    }
    const result = await menuService.updateMenuItem(restaurantId, itemId, itemData);
    res.json(result);
  } catch (error) {
    console.error('Error al actualizar item:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/menu/:restaurantId/items/:itemId
router.delete('/:restaurantId/items/:itemId', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;
    const result = await menuService.deleteMenuItem(restaurantId, itemId);
    res.json(result);
  } catch (error) {
    console.error('Error al eliminar item:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- RUTAS PARA COMBOS ---
// GET /api/menu/:restaurantId/combos
router.get('/:restaurantId/combos', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const combos = await menuService.getMenuCombos(restaurantId);
    res.json(combos);
  } catch (error) {
    console.error('Error al obtener combos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/menu/:restaurantId/combos/:comboId
router.get('/:restaurantId/combos/:comboId', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId, comboId } = req.params;
    const combo = await menuService.getMenuCombo(restaurantId, comboId);
    res.json(combo);
  } catch (error) {
    console.error('Error al obtener combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/menu/:restaurantId/combos
router.post('/:restaurantId/combos', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const comboData = req.body;
    // Validaciones básicas
    if (!comboData.name || comboData.items.length === 0) {
        return res.status(400).json({ error: 'Nombre y al menos un item son obligatorios para el combo' });
    }
    const result = await menuService.createMenuCombo(restaurantId, comboData);
    res.json(result);
  } catch (error) {
    console.error('Error al crear combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/menu/:restaurantId/combos/:comboId
router.put('/:restaurantId/combos/:comboId', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId, comboId } = req.params;
    const comboData = req.body;
    // Validaciones básicas
    if (comboData.name && comboData.items.length === 0) { // Si se intenta actualizar el nombre, debe haber items
        if (comboData.items.length === 0) {
            return res.status(400).json({ error: 'Al menos un item es obligatorio para el combo' });
        }
    }
    const result = await menuService.updateMenuCombo(restaurantId, comboId, comboData);
    res.json(result);
  } catch (error) {
    console.error('Error al actualizar combo:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/menu/:restaurantId/combos/:comboId
router.delete('/:restaurantId/combos/:comboId', verifyToken, verifyOwner, async (req, res) => {
  try {
    const { restaurantId, comboId } = req.params;
    const result = await menuService.deleteMenuCombo(restaurantId, comboId);
    res.json(result);
  } catch (error) {
    console.error('Error al eliminar combo:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;