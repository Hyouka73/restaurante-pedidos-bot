const { db, admin } = require('../config/firebase'); // Agregamos 'admin'

class OrderService {
  // Crear un nuevo pedido
  async createOrder(restaurantId, orderData) {
    const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc();
    const newOrder = {
      id: orderRef.id,
      restaurantId,
      status: 'pending', // Estados: pending, confirmed, preparing, ready, delivered, cancelled
      statusHistory: [{
        status: 'pending',
        timestamp: new Date()
      }],
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await orderRef.set(newOrder);
    return { id: orderRef.id, ...newOrder };
  }

  // Obtener un pedido por ID
  async getOrder(restaurantId, orderId) {
    const orderDoc = await db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new Error('Pedido no encontrado');
    }
    return { id: orderDoc.id, ...orderDoc.data() };
  }

  // Actualizar el estado de un pedido
  async updateOrderStatus(restaurantId, orderId, newStatus, notes = '') {
    const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    if (!orderDoc.exists) {
      throw new Error('Pedido no encontrado');
    }

    const newStatusEntry = {
      status: newStatus,
      timestamp: new Date(),
      notes
    };

    await orderRef.update({
      status: newStatus,
      'statusHistory': admin.firestore.FieldValue.arrayUnion(newStatusEntry),
      updatedAt: new Date()
    });
    return { success: true };
  }

  // Obtener pedidos de un restaurante (filtrados por estado opcionalmente)
  async getOrders(restaurantId, statusFilter = null) {
    let query = db.collection('restaurants').doc(restaurantId).collection('orders').orderBy('createdAt', 'desc');
    if (statusFilter) {
      query = query.where('status', '==', statusFilter);
    }
    const snapshot = await query.get();
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return orders;
  }
}

module.exports = new OrderService();