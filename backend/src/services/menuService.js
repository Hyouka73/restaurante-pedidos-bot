// backend/src/services/menuService.js
const { db } = require('../config/firebase');

class MenuService {

  // --- ITEMS ---
  async getMenuItems(restaurantId) {
    try {
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
      const doc = await db.collection('restaurants').doc(restaurantId).collection('menu').doc('items').collection('items').doc(itemId).get();
      if (!doc.exists) {
        throw new Error('Item no encontrado');
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error al obtener item del menú:', error);
      throw error;
    }
  }

  async createMenuItem(restaurantId, itemData) {
    try {
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

  async createMenuCombo(restaurantId, comboData) {
    try {
      const comboRef = db.collection('restaurants').doc(restaurantId).collection('menu').doc('combos').collection('combos').doc();
      const dataToSave = {
        ...comboData,
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
      const comboRef = db.collection('restaurants').doc(restaurantId).collection('menu').doc('combos').collection('combos').doc(comboId);
      const doc = await comboRef.get();
      if (!doc.exists) {
        throw new Error('Combo no encontrado');
      }
      const dataToUpdate = {
        ...comboData,
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
      await db.collection('restaurants').doc(restaurantId).collection('menu').doc('combos').collection('combos').doc(comboId).delete();
      return { success: true };
    } catch (error) {
      console.error('Error al eliminar combo del menú:', error);
      throw error;
    }
  }
}

module.exports = new MenuService();