const express = require('express');
const menuService = require('../../services/menuService');
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
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// GET /api/menu/:restaurantId
router.get('/:restaurantId', verifyToken, async (req, res) => {
  try {
    // Opcional: Verificar que el usuario sea el dueño del restaurante
    const { restaurantId } = req.params;
    const restaurantData = await authService.getRestaurantByUserUid(req.user.uid);
    if (restaurantData.restaurantId !== restaurantId) {
      return res.status(403).json({ error: 'No autorizado para ver este menú' });
    }

    const menuItems = await menuService.getMenu(restaurantId);
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/menu/:restaurantId (Crear/Actualizar item)
router.post('/:restaurantId', verifyToken, async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const itemData = req.body;
    const itemId = itemData.id || null; // Si no tiene ID, es una creación

    // Opcional: Verificar que el usuario sea el dueño
    const restaurantData = await authService.getRestaurantByUserUid(req.user.uid);
    if (restaurantData.restaurantId !== restaurantId) {
      return res.status(403).json({ error: 'No autorizado para editar este menú' });
    }

    const result = await menuService.upsertMenuItem(restaurantId, itemId, itemData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/menu/:restaurantId/:itemId
router.delete('/:restaurantId/:itemId', verifyToken, async (req, res) => {
  try {
    const { restaurantId, itemId } = req.params;

    // Opcional: Verificar que el usuario sea el dueño
    const restaurantData = await authService.getRestaurantByUserUid(req.user.uid);
    if (restaurantData.restaurantId !== restaurantId) {
      return res.status(403).json({ error: 'No autorizado para editar este menú' });
    }

    await menuService.deleteMenuItem(restaurantId, itemId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;