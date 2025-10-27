// backend/src/services/menuService.js
// CORREGIDO: Ruta para config/firebase.js (relativa a backend/src/services/)
const { db } = require('../config/firebase'); // Subimos 1 nivel: .. -> backend/src/, luego bajamos a config/

class MenuService {

  // --- ITEMS ---
  async getMenuItems(restaurantId) {
    try {
      // Accedemos a la subcolección 'items' dentro de 'menu'
      const snapshot = await db.collection('restaurants').doc(restaurantId).collection('menu').doc('items').collection('items').orderBy('order', 'asc').get();
      const items = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });
      return items;
    } catch (error) {
      console.error('Error al obtener items del menú:', error);
      throw error;
    }
  }

  async getMenuItem(restaurantId, itemId) {
    try {
      // Accedemos al documento específico dentro de la subcolección 'items'
      const doc = await db.collection('restaurants').doc(restaurantId).collection('menu').doc('items').collection('items').doc(itemId).get();
      if (!doc.exists) {
        // Return null instead of throwing an error so Promise.all doesn't fail
        console.warn(`Item con ID ${itemId} no encontrado para herencia de tags.`);
        return null;
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error al obtener item del menú:', error);
      throw error;
    }
  }

  async createMenuItem(restaurantId, itemData) {
    try {
      // Creamos un nuevo documento en la subcolección 'items'
      const itemRef = db.collection('restaurants').doc(restaurantId).collection('menu').doc('items').collection('items').doc();
      const dataToSave = {
        ...itemData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await itemRef.set(dataToSave);
      return { success: true, id: itemRef.id };
    } catch (error) {
      console.error('Error al crear item del menú:', error);
      throw error;
    }
  }

  async updateMenuItem(restaurantId, itemId, itemData) {
    try {
      // Actualizamos el documento específico en la subcolección 'items'
      const itemRef = db.collection('restaurants').doc(restaurantId).collection('menu').doc('items').collection('items').doc(itemId);
      const doc = await itemRef.get();
      if (!doc.exists) {
        throw new Error('Item no encontrado');
      }
      const dataToUpdate = {
        ...itemData,
        updatedAt: new Date()
      };
      await itemRef.update(dataToUpdate);
      return { success: true };
    } catch (error) {
      console.error('Error al actualizar item del menú:', error);
      throw error;
    }
  }

  async deleteMenuItem(restaurantId, itemId) {
    try {
      // Eliminamos el documento específico en la subcolección 'items'
      await db.collection('restaurants').doc(restaurantId).collection('menu').doc('items').collection('items').doc(itemId).delete();
      return { success: true };
    } catch (error) {
      console.error('Error al eliminar item del menú:', error);
      throw error;
    }
  }

  // --- COMBOS ---
  async getMenuCombos(restaurantId) {
    try {
      // Accedemos a la subcolección 'combos' dentro de 'menu'
      const snapshot = await db.collection('restaurants').doc(restaurantId).collection('menu').doc('combos').collection('combos').orderBy('order', 'asc').get();
      const combos = [];
      snapshot.forEach(doc => {
        combos.push({ id: doc.id, ...doc.data() });
      });
      return combos;
    } catch (error) {
      console.error('Error al obtener combos del menú:', error);
      throw error;
    }
  }

  async getMenuCombo(restaurantId, comboId) {
    try {
      // Accedemos al documento específico dentro de la subcolección 'combos'
      const doc = await db.collection('restaurants').doc(restaurantId).collection('menu').doc('combos').collection('combos').doc(comboId).get();
      if (!doc.exists) {
        throw new Error('Combo no encontrado');
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error al obtener combo del menú:', error);
      throw error;
    }
  }

  // Helper function for tag inheritance (CORRECTED)
  async _getInheritedTags(restaurantId, comboData) {
    if (!comboData.componentes || !Array.isArray(comboData.componentes)) {
      return {}; // Return empty object
    }

    const itemIds = new Set();
    comboData.componentes.forEach(componente => {
      if (componente.items_opciones && Array.isArray(componente.items_opciones)) {
        componente.items_opciones.forEach(item => {
          if (typeof item === 'object' && item.id) {
            itemIds.add(item.id);
          } else if (typeof item === 'string') {
            itemIds.add(item);
          }
        });
      }
    });

    if (itemIds.size === 0) {
      return {}; // Return empty object
    }

    // Initialize a structure to hold sets of tags for each category
    const inheritedTags = {
        categoria_general: new Set(),
        tipo_plato: new Set(),
        proteina: new Set(),
        perfil_sabor: new Set(),
    };
    
    const itemPromises = Array.from(itemIds).map(itemId => this.getMenuItem(restaurantId, itemId));
    
    try {
      const items = await Promise.all(itemPromises);
      items.forEach(item => {
        if (item && item.tags && typeof item.tags === 'object') {
          // For each potential tag category, add the item's tag to the corresponding set
          for (const key in inheritedTags) {
            if (item.tags[key]) {
              inheritedTags[key].add(item.tags[key]);
            }
          }
        }
      });
    } catch (error) {
        console.error('Error fetching items for tag inheritance:', error);
    }

    // Convert sets to arrays for the final JSON object
    const result = {};
    for (const key in inheritedTags) {
        if(inheritedTags[key].size > 0) {
            result[key] = Array.from(inheritedTags[key]);
        }
    }

    return result;
  }

  async createMenuCombo(restaurantId, comboData) {
    try {
      // Get inherited tags
      const inheritedTags = await this._getInheritedTags(restaurantId, comboData);

      // Creamos un nuevo documento en la subcolección 'combos'
      const comboRef = db.collection('restaurants').doc(restaurantId).collection('menu').doc('combos').collection('combos').doc();
      const dataToSave = {
        ...comboData,
        tags_heredados: inheritedTags, // Add inherited tags (now an object)
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await comboRef.set(dataToSave);
      return { success: true, id: comboRef.id };
    } catch (error) {
      console.error('Error al crear combo del menú:', error);
      throw error;
    }
  }

  async updateMenuCombo(restaurantId, comboId, comboData) {
    try {
      // Actualizamos el documento específico en la subcolección 'combos'
      const comboRef = db.collection('restaurants').doc(restaurantId).collection('menu').doc('combos').collection('combos').doc(comboId);
      const doc = await comboRef.get();
      if (!doc.exists) {
        throw new Error('Combo no encontrado');
      }

      // Get inherited tags
      const inheritedTags = await this._getInheritedTags(restaurantId, comboData);

      const dataToUpdate = {
        ...comboData,
        tags_heredados: inheritedTags, // Add inherited tags (now an object)
        updatedAt: new Date()
      };
      await comboRef.update(dataToUpdate);
      return { success: true };
    } catch (error) {
      console.error('Error al actualizar combo del menú:', error);
      throw error;
    }
  }

  async deleteMenuCombo(restaurantId, comboId) {
    try {
      // Eliminamos el documento específico en la subcolección 'combos'
      await db.collection('restaurants').doc(restaurantId).collection('menu').doc('combos').collection('combos').doc(comboId).delete();
      return { success: true };
    } catch (error) {
      console.error('Error al eliminar combo del menú:', error);
      throw error;
    }
  }

  // --- FUNCIÓN EXISTENTE PERO ACTUALIZADA PARA COMPATIBILIDAD ---
  // Esta función es utilizada por el bot, y ahora debe obtener tanto items como combos
  // Opcional: Crear una función específica para el bot que combine ambos
  async getMenu(restaurantId) {
    try {
      // Obtener items
      const itemsSnapshot = await db.collection('restaurants').doc(restaurantId).collection('menu').doc('items').collection('items').orderBy('order', 'asc').get();
      const items = [];
      itemsSnapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() });
      });

      // Obtener combos
      const combosSnapshot = await db.collection('restaurants').doc(restaurantId).collection('menu').doc('combos').collection('combos').orderBy('order', 'asc').get();
      const combos = [];
      combosSnapshot.forEach(doc => {
        combos.push({ id: doc.id, ...doc.data() });
      });

      // Devolver ambos
      return { items, combos };
    } catch (error) {
      console.error('Error al obtener el menú completo:', error);
      throw error;
    }
  }

  // --- FUNCIÓN PARA EL BOT: Devuelve array plano de items y combos disponibles ---
  async getMenuForBot(restaurantId) {
    console.log(`[menuService.getMenuForBot] 🔍 Iniciando para restaurante ${restaurantId}`);
    
    try {
      // ESTRATEGIA: Obtener TODOS y filtrar en memoria (más simple, sin índices)
      
      // Obtener todos los items
      const itemsSnapshot = await db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('menu')
        .doc('items')
        .collection('items')
        .get();
      
      const items = [];
      itemsSnapshot.forEach(doc => {
        const data = doc.data();
        // Filtrar solo disponibles
        if (data.available !== false) {
          items.push({ 
            id: doc.id, 
            type: 'item',
            ...data
          });
        }
      });

      // Obtener todos los combos
      const combosSnapshot = await db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('menu')
        .doc('combos')
        .collection('combos')
        .get();
      
      const combos = [];
      combosSnapshot.forEach(doc => {
        const data = doc.data();
        // Filtrar solo disponibles
        if (data.available !== false) {
          combos.push({ 
            id: doc.id, 
            type: 'combo',
            isCombo: true,
            ...data
          });
        }
      });

      // Combinar
      const allItems = [...items, ...combos];
      
      // Ordenar manualmente por order
      allItems.sort((a, b) => {
        const orderA = a.order || 0;
        const orderB = b.order || 0;
        return orderA - orderB;
      });
      
      console.log(`[menuService.getMenuForBot] ✅ ${items.length} items + ${combos.length} combos = ${allItems.length} total`);
      console.log(`[menuService.getMenuForBot] 📋 Resultado es Array:`, Array.isArray(allItems));
      
      return allItems;
      
    } catch (error) {
      console.error('[menuService.getMenuForBot] ❌ Error:', error);
      return [];
    }
  }

}

module.exports = new MenuService();
