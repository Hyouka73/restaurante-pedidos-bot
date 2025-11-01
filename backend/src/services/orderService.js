const { db, admin } = require('../config/firebase');
const telegramNotificationService = require('./telegramNotificationService');
// 🔥 1. Importamos el "publicador" de Redis (de tu redisClient.js)
const { publisher } = require('../config/redisClient');

const SSE_CHANNEL = 'orders_channel'; // El canal que definimos

class OrderService {

  /**
   * Crea un nuevo pedido en la base de datos.
   */
  async createOrder(restaurantId, orderData) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const ordersCollection = restaurantRef.collection('orders');
    
    const restaurantDoc = await restaurantRef.get();
    const currentCounter = restaurantDoc.data()?.orderCounter || 0;
    const newOrderNumber = currentCounter + 1;
    
    const newOrder = {
      ...orderData,
      orderNumber: newOrderNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
      statusHistory: [
        {
          status: 'pending',
          timestamp: new Date(),
          notes: 'Pedido creado por el cliente.'
        }
      ]
    };

    const orderRef = await ordersCollection.add(newOrder);
    await restaurantRef.update({ orderCounter: newOrderNumber });

    // ✅ CORRECCIÓN: Creamos el objeto PRIMERO
    const createdOrder = { id: orderRef.id, ...newOrder };

    // --- 🔥 2. PUBLICAMOS EN REDIS (ANTES DE RETORNAR) ---
    try {
      console.log(`[OrderService] Publicando 'order_new' en ${SSE_CHANNEL}`);
      // Usamos el 'publisher' de tu redisClient.js
      const message = JSON.stringify({ type: 'order_new', payload: createdOrder });
      await publisher.publish(SSE_CHANNEL, message);
    } catch (sseError) {
      console.error('[OrderService] Error publicando en Redis:', sseError);
    }
    // --- FIN DE LA CORRECCIÓN ---

    // ✅ CORRECCIÓN: El 'return' va al final.
    return createdOrder;
  }

  /**
   * Obtiene un pedido por su ID.
   */
  async getOrder(restaurantId, orderId) {
    const orderDoc = await db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new Error('Pedido no encontrado');
    }
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Actualiza el estado de un pedido y notifica al usuario.
   */
  async updateOrderStatus(restaurantId, orderId, newStatus, notes = '') {
    const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId);

    try {
      await db.runTransaction(async (transaction) => {
        const orderDoc = await transaction.get(orderRef);
        if (!orderDoc.exists) {
          throw new Error('Pedido no encontrado');
        }
        const newStatusEntry = {
          status: newStatus,
          timestamp: new Date(),
          notes
        };
        transaction.update(orderRef, {
          status: newStatus,
          updatedAt: new Date(),
          statusHistory: admin.firestore.FieldValue.arrayUnion(newStatusEntry)
        });
      });
      console.log(`[OrderService] Transaction successful for order ${orderId} to status ${newStatus}.`);
    } catch (error) {
      console.error(`[OrderService] Transaction failed for order ${orderId}:`, error);
      throw error;
    }

    try {
      const updatedOrderData = await this.getOrder(restaurantId, orderId);
      
      if (updatedOrderData.status !== newStatus) {
           console.error(`CRITICAL: Status mismatch for ${orderId}...`);
      }

      // --- 🔥 3. PUBLICAMOS EN REDIS (Esta parte ya estaba bien) ---
      console.log(`[OrderService] Publicando 'order_update' en ${SSE_CHANNEL}`);
      const message = JSON.stringify({ type: 'order_update', payload: updatedOrderData });
      await publisher.publish(SSE_CHANNEL, message);
      // --- FIN DE LA MODIFICACIÓN ---

      const customerTelegramId = updatedOrderData.customer?.telegramId;
      if (customerTelegramId && updatedOrderData.notificationsEnabled !== false) {
        await telegramNotificationService.notifyUserOfStatusChange(customerTelegramId, newStatus, updatedOrderData, restaurantId);
      }
    } catch (notifyError) {
      console.error(`[OrderService] Error during notification phase for ${orderId}:`, notifyError);
    }

    return { success: true };
  }

  /**
   * Obtiene todos los pedidos de un restaurante.
   */
  async getOrders(restaurantId) {
    const snapshot = await db.collection('restaurants').doc(restaurantId).collection('orders').orderBy('createdAt', 'desc').get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Busca el pedido activo más reciente de un usuario de Telegram.
   */
  async getActiveOrderByUser(restaurantId, telegramId) {
    const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
    
    const query = db.collection('restaurants').doc(restaurantId).collection('orders')
      .where('customer.telegramId', '==', telegramId)
      .where('status', 'in', activeStatuses)
      .orderBy('createdAt', 'desc')
      .limit(1);
      
    const snapshot = await query.get();

    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Busca todos los pedidos activos de un usuario de Telegram en todos los restaurantes.
   */
  async getAllActiveOrdersByUser(telegramId) {
    const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivering'];
    const restaurantsSnapshot = await db.collection('restaurants').get();
    
    const allActiveOrders = [];

    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const restaurantId = restaurantDoc.id;
      const ordersQuery = db.collection('restaurants').doc(restaurantId).collection('orders')
        .where('customer.telegramId', '==', telegramId)
        .where('status', 'in', activeStatuses);
        
      const ordersSnapshot = await ordersQuery.get();
      
      ordersSnapshot.forEach(doc => {
        allActiveOrders.push({ id: doc.id, restaurantId: restaurantId, ...doc.data() });
      });
    }

    allActiveOrders.sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate());

    return allActiveOrders;
  }
}

module.exports = new OrderService();