// backend/src/services/recommendationService.js

const menuService = require('./menuService');

// Define el orden lógico de los filtros para hacer preguntas
const FILTER_ORDER = ['categoria_general', 'tipo_plato', 'proteina', 'perfil_sabor'];
const RECOMMENDATION_THRESHOLD = 3;

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

      // 4. Lógica de Decisión
      if (filteredItems.length <= RECOMMENDATION_THRESHOLD || !nextFilterKey) {
        // DECISIÓN A: Mostrar recomendaciones finales
        return {
          tipo_respuesta: 'recomendacion_final',
          items: filteredItems.map(item => ({ // Limpiar datos para el bot
            tipo_item: item.type === 'combo' ? 'combo_manual' : 'producto',
            id: item.id,
            nombre: item.name,
            descripcion: item.description,
            precio: item.price,
            foto_url: item.imageUrl || null
          }))
        };
      } else {
        // DECISIÓN B: Hacer la siguiente pregunta
        const options = this._getAvailableOptions(filteredItems, nextFilterKey);
        
        // Si no se encuentran opciones significativas para la siguiente pregunta, devolver los resultados actuales
        if (options.length <= 1) {
             return {
                tipo_respuesta: 'recomendacion_final',
                items: filteredItems.map(item => ({
                    tipo_item: item.type === 'combo' ? 'combo_manual' : 'producto',
                    id: item.id,
                    nombre: item.name,
                    descripcion: item.description,
                    precio: item.price,
                    foto_url: item.imageUrl || null
                }))
            };
        }

        return {
          tipo_respuesta: 'pregunta',
          texto: this._getQuestionText(nextFilterKey),
          opciones: options.map(option => ({
            texto_boton: this._formatButtonText(option),
            filtro_a_agregar: `${nextFilterKey}:${option}`
          }))
        };
      }
    } catch (error) {
      console.error('[RecommendationService] Error al obtener recomendación:', error);
      throw error;
    }
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

  _getQuestionText(filterKey) {
    const questions = {
      categoria_general: '¡Hola! 👋 ¿Qué te apetece hoy?',
      tipo_plato: '¡Entendido! ¿Buscas una entrada, un plato fuerte o algo para compartir?',
      proteina: '¡Perfecto! ¿Qué proteína te apetece hoy?',
      perfil_sabor: '¡Ya casi! ¿Prefieres algo ligero o más bien contundente?'
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