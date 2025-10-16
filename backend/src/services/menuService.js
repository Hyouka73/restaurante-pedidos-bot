const { db } = require('../config/firebase');

class MenuService {
  // Obtener el menú de un restaurante
  async getMenu(restaurantId) {
    const snapshot = await db.collection('restaurants').doc(restaurantId).collection('menu').orderBy('order', 'asc').get();
    const items = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    return items;
  }

  // Crear/Actualizar un item del menú
  async upsertMenuItem(restaurantId, itemId, itemData) {
    const itemRef = db.collection('restaurants').doc(restaurantId).collection('menu').doc(itemId);
    await itemRef.set({
      ...itemData,
      updatedAt: new Date()
    });
    return { success: true, id: itemRef.id };
  }

  // Eliminar un item del menú
  async deleteMenuItem(restaurantId, itemId) {
    await db.collection('restaurants').doc(restaurantId).collection('menu').doc(itemId).delete();
    return { success: true };
  }
}

module.exports = new MenuService();