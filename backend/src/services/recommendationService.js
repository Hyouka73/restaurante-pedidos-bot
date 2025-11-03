// backend/src/services/recommendationService.js

const menuService = require('./menuService');

// Define el orden lógico de los filtros para hacer preguntas
const FILTER_ORDER = ['categoria_general', 'tipo_plato', 'proteina', 'perfil_sabor'];
// const RECOMMENDATION_THRESHOLD = 3; // <-- Eliminamos esta regla "tonta"

class RecommendationService {

  /**
   * Procesa los filtros actuales y decide si hacer otra pregunta
   * o devolver las recomendaciones finales.
   * @param {string} restaurantId
   * @param {string[]} currentFilters - ej: ["categoria_general:Comida", "proteina:Res"]
   * @returns {object} - Un objeto de respuesta (sea 'pregunta' o 'recomendacion_final')
   */
  async getRecommendation(restaurantId, currentFilters = []) {
    try {
      // 1. Obtener todos los items y combos del menú disponibles
      const allItems = await menuService.getMenuForBot(restaurantId);
      if (!allItems || allItems.length === 0) {
        return { tipo_respuesta: 'recomendacion_final', items: [] }; // No hay items para recomendar
      }

      // 2. Parsear filtros y filtrar los resultados
      const parsedFilters = this._parseFilters(currentFilters);
      const filteredItems = this._applyFilters(allItems, parsedFilters);

      // 3. Determinar el siguiente filtro lógico a preguntar
      const nextFilterKey = this._findNextFilter(parsedFilters);

      // --- 🔥 LÓGICA DE DECISIÓN MEJORADA ---
      
      // 1. ¿No hay más preguntas que hacer?
      if (!nextFilterKey) {
        return this._formatFinalResponse(filteredItems); // Muestra lo que haya
      }
      
      // 2. ¿Cuáles son las opciones para la siguiente pregunta?
      const options = this._getAvailableOptions(filteredItems, nextFilterKey);

      // 3. ¿Hay solo una opción útil (o ninguna)?
      //    (Ej: Si después de filtrar solo queda "Pollo", no tiene sentido preguntar "¿Qué proteína?")
      //    Si no hay opciones, o solo hay una, es mejor mostrar los resultados directamente.
      if (options.length <= 1) {
        // Si no hay más preguntas Y los resultados son pocos, no tiene sentido seguir.
        return this._formatFinalResponse(filteredItems);
      }
      
      // 4. ¡SÍ hay pregunta Y hay varias opciones!
      //    (Ej: Opciones son 'Res' y 'Pollo'). AHORA SÍ PREGUNTA.
      return {
        tipo_respuesta: 'pregunta',
        texto: this._getQuestionText(nextFilterKey, filteredItems.length),
        opciones: options.map(option => ({
          texto_boton: this._formatButtonText(option),
          filtro_a_agregar: `${nextFilterKey}:${option}`
        }))
      };
      
    } catch (error) {
      console.error('[RecommendationService] Error al obtener recomendación:', error);
      throw error;
    }
  }

  // 🔥 NUEVA FUNCIÓN DE AYUDA (para no repetir código)
  _formatFinalResponse(items) {
    return {
      tipo_respuesta: 'recomendacion_final',
      items: items.map(item => ({
        tipo_item: item.type === 'combo' ? 'combo_manual' : 'producto',
        id: item.id,
        nombre: item.name,
        descripcion: item.description,
        precio: item.price,
        foto_url: item.imageUrl || null
      }))
    };
  }

  _parseFilters(filters) {
    const parsed = {};
    filters.forEach(f => {
      const [key, value] = f.split(':', 2);
      if (key && value) {
        parsed[key] = value;
      }
    });
    return parsed;
  }

  _applyFilters(items, parsedFilters) {
    const filterKeys = Object.keys(parsedFilters);
    if (filterKeys.length === 0) {
      return items;
    }
    
    return items.filter(item => {
      return filterKeys.every(key => {
        const filterValue = parsedFilters[key];
        
        if (item.type === 'item') {
          // Para items, los tags están en `item.tags`
          return item.tags && item.tags[key] === filterValue;
        }
        
        if (item.type === 'combo') {
          // Para combos, los tags están en `item.tags_heredados` (objeto clave-valor)
          // El valor es un array, así que comprobamos la inclusión.
          return item.tags_heredados && item.tags_heredados[key] && item.tags_heredados[key].includes(filterValue);
        }
        
        return false;
      });
    });
  }

  _findNextFilter(parsedFilters) {
    const appliedFilterKeys = Object.keys(parsedFilters);
    return FILTER_ORDER.find(filter => !appliedFilterKeys.includes(filter));
  }

  _getAvailableOptions(items, filterKey) {
    const options = new Set();
    items.forEach(item => {
      if (item.type === 'item' && item.tags && item.tags[filterKey]) {
        options.add(item.tags[filterKey]);
      } else if (item.type === 'combo' && item.tags_heredados && item.tags_heredados[filterKey]) {
        // Ahora también podemos obtener opciones de los combos
        item.tags_heredados[filterKey].forEach(tagValue => options.add(tagValue));
      }
    });
    return Array.from(options);
  }

  _getQuestionText(filterKey, count) {
    const questions = {
      categoria_general: `¡Hola! 👋 Tenemos ${count} opciones. ¿Qué te apetece hoy?`,
      tipo_plato: `¡Entendido! De las ${count} opciones que quedan, ¿buscas una entrada, un plato fuerte o algo más?`,
      proteina: `¡Perfecto! Tenemos ${count} platillos con estas proteínas. ¿Cuál prefieres?`,
      perfil_sabor: `¡Ya casi! De las ${count} opciones, ¿prefieres algo ligero o más bien contundente?`
    };
    return questions[filterKey] || '¿Qué más te gustaría?';
  }
  
  _formatButtonText(option) {
      const emojis = {
          'Res': '🥩', 'Pollo': '🍗', 'Pescado': '🐟', 'Cerdo': '🐖', 'Vegano': '🌱', 'Vegetariano': '🥕',
          'Comida': '🍔', 'Bebida': '🥤', 'Postre': '🍰',
          'Picante': '🌶️', 'Dulce': '🍬', 'Salado': '🧂',
          'Ligero': '🥗', 'Contundente': '💪',
          'Entrada': ' appetizers', 'Plato Fuerte': '🍽️', 'Para Compartir': '👨‍👩‍👧‍👦'
      };
      return `${option} ${emojis[option] || ''}`.trim();
  }

}

module.exports = new RecommendationService();