// backend/src/services/recommendationService.js

const menuService = require('./menuService');

// Define el orden lógico de los filtros para hacer preguntas
const FILTER_ORDER = ['categoria_general', 'tipo_plato', 'proteina', 'perfil_sabor'];
// 🔥 Umbral de cuántos items mostrar antes de dejar de preguntar
const RECOMMENDATION_THRESHOLD = 4; 

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
        return { tipo_respuesta: 'recomendacion_final', items: [] }; // No hay items
      }

      let parsedFilters = this._parseFilters(currentFilters);
      let filteredItems = allItems;
      let lastMessage = null; // 🔥 Para notificar al usuario de auto-selecciones

      // --- 🔥 LÓGICA DE DECISIÓN EN CASCADA ---
      while (true) {
        filteredItems = this._applyFilters(allItems, parsedFilters);
        const nextFilterKey = this._findNextFilter(parsedFilters);

        // --- Condición de Salida 1: Se acabaron las preguntas O quedan pocos resultados ---
        if (!nextFilterKey || (filteredItems.length > 0 && filteredItems.length <= RECOMMENDATION_THRESHOLD)) {
          return this._formatFinalResponse(filteredItems, lastMessage);
        }

        // --- Condición de Salida 2: Filtramos tanto que no quedó nada ---
        if (filteredItems.length === 0) {
            // Esto significa que la última elección resultó en 0 items.
            // Es mejor mostrar 0 items que entrar en un bucle.
            return this._formatFinalResponse(filteredItems, lastMessage);
        }

        // Si llegamos aquí, hay una pregunta y > THRESHOLD resultados.
        const options = this._getAvailableOptions(filteredItems, nextFilterKey);

        // --- Condición de Salida 3: Hay una PREGUNTA REAL (múltiples opciones) ---
        if (options.length > 1) {
          return this._formatQuestionResponse(nextFilterKey, filteredItems.length, options, lastMessage);
        }

        // --- Lógica de Cascada 1: Solo hay UNA opción (auto-seleccionar) ---
        if (options.length === 1) {
          const autoSelectedValue = options[0];
          parsedFilters[nextFilterKey] = autoSelectedValue;
          // Guardamos un mensaje para notificar al usuario
          lastMessage = `Veo que buscas algo con ${autoSelectedValue.toLowerCase()}...`;
          // El loop continúa, filtrando con esta nueva opción
        }

        // --- Lógica de Cascada 2: No hay opciones para esta pregunta (saltar) ---
        if (options.length === 0) {
          parsedFilters[nextFilterKey] = null; // Marcamos como "saltada"
          // El loop continúa, buscando el siguiente filterKey
        }
      } // Fin del while(true)
      
    } catch (error) {
      console.error('[RecommendationService] Error al obtener recomendación:', error);
      throw error;
    }
  }

  /**
   * 🔥 Modificado: Formatea la respuesta final, añadiendo un mensaje de cascada si existe.
   */
  _formatFinalResponse(items, preamble = null) {
    return {
      tipo_respuesta: 'recomendacion_final',
      preamble: preamble, // ej: "Veo que buscas algo con Res..."
      items: items.map(item => ({
        tipo_item: item.isCombo ? 'combo' : 'producto', // Corregido (tu getMenuForBot usa isCombo)
        id: item.id,
        nombre: item.name,
        descripcion: item.description,
        precio: item.price,
        foto_url: item.imageUrl || null
      }))
    };
  }

  /**
   * 🔥 Modificado: Formatea la pregunta, añadiendo un mensaje de cascada si existe.
   */
  _formatQuestionResponse(filterKey, count, options, preamble = null) {
    return {
      tipo_respuesta: 'pregunta',
      preamble: preamble, // ej: "Veo que buscas algo con Res..."
      texto: this._getQuestionText(filterKey, count),
      opciones: options.map(option => ({
        texto_boton: this._formatButtonText(option),
        filtro_a_agregar: `${filterKey}:${option}`
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

  /**
   * 🔥 Modificado: Ahora ignora los filtros 'null' (saltados)
   */
  _applyFilters(items, parsedFilters) {
    const filterKeys = Object.keys(parsedFilters);
    if (filterKeys.length === 0) {
      return items;
    }
    
    return items.filter(item => {
      return filterKeys.every(key => {
        const filterValue = parsedFilters[key];
        
        // Si el valor del filtro es null (porque se saltó), no aplicamos este filtro
        if (filterValue === null) return true; 
        
        // (Tu lógica de filtrado original está bien)
        if (item.type === 'item' || !item.isCombo) {
          return item.tags && item.tags[key] === filterValue;
        }
        
        if (item.type === 'combo' || item.isCombo) {
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
      if ((item.type === 'item' || !item.isCombo) && item.tags && item.tags[filterKey]) {
        options.add(item.tags[filterKey]);
      } else if ((item.type === 'combo' || item.isCombo) && item.tags_heredados && item.tags_heredados[filterKey]) {
        item.tags_heredados[filterKey].forEach(tagValue => options.add(tagValue));
      }
    });
    return Array.from(options);
  }

  _getQuestionText(filterKey, count) {
    const questions = {
      categoria_general: `¡Hola! 👋 Veo ${count} opciones en total. ¿Qué te apetece hoy?`,
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
      return `${emojis[option] || ''} ${option}`.trim();
  }

}

module.exports = new RecommendationService();