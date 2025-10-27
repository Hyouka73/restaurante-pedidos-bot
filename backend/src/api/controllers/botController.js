// backend/src/api/controllers/botController.js
const RecommendationService = require('../../services/recommendationService');
const menuService = require('../../services/menuService');

// Un wrapper para manejar errores de async/await
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

exports.getRecommendation = asyncHandler(async (req, res) => {
  const { restaurantId, session_id, filtros_actuales } = req.body;

  // Llamar al servicio correcto
  const result = await RecommendationService.getRecommendation(restaurantId, filtros_actuales);
  
  res.status(200).json(result);
});

exports.getComboComponents = asyncHandler(async (req, res) => {
    const { restaurantId, combo_id } = req.body;

    const combo = await menuService.getMenuCombo(restaurantId, combo_id);

    if (!combo) {
        return res.status(404).json({ message: 'Combo no encontrado' });
    }

    // Formatear la respuesta según la especificación
    const response = {
        nombre_combo: combo.name,
        componentes: (combo.componentes || []).map(c => ({
            titulo_pregunta: c.title, // Asumiendo que el campo es `title`
            items_opciones: c.items_opciones.map(item => ({ id: item.id, nombre: item.name })) // Asumiendo esta estructura
        }))
    };
    
    res.status(200).json(response);
});

exports.getCrossSell = asyncHandler(async (req, res) => {
    const { restaurantId, item_agregado_id } = req.body;

    const item = await menuService.getMenuItem(restaurantId, item_agregado_id);

    if (!item || !item.sugerir_items || item.sugerir_items.length === 0) {
        return res.status(200).json({ sugerencias: [] });
    }

    const suggestionPromises = item.sugerir_items.map(itemId => menuService.getMenuItem(restaurantId, itemId));
    const suggestions = await Promise.all(suggestionPromises);

    // Filtrar nulos (si un item no fue encontrado) y formatear
    const formattedSuggestions = suggestions
        .filter(s => s)
        .map(s => ({
            id: s.id,
            nombre: s.name,
            descripcion: s.description,
            precio: s.price,
            foto_url: s.imageUrl || null
        }));

    res.status(200).json({ sugerencias: formattedSuggestions });
});
