const { db, admin } = require('../config/firebase');
// 🔥 AÑADIR AL INICIO DE LOS IMPORTS
const notificationService = require('../bot/services/notificationService');
// Importamos el "publicador" de Redis
const { publisher } = require('../config/redisClient');

const SSE_CHANNEL = 'orders_channel';

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

    // ✅ CORRECCIÓN 1: Creamos el objeto PRIMERO
    const createdOrder = { id: orderRef.id, ...newOrder };

    // --- PUBLICAMOS EN REDIS (ANTES DE RETORNAR) ---
    try {
      console.log(`[OrderService] Publicando 'order_new' en ${SSE_CHANNEL}`);
      // Usamos el 'publisher' de tu redisClient.js
      const message = JSON.stringify({ type: 'order_new', payload: createdOrder });
      await publisher.publish(SSE_CHANNEL, message);
    } catch (sseError) {
      console.error('[OrderService] Error publicando en Redis:', sseError);
    }
    
    // ✅ CORRECCIÓN 2: El 'return' va al final.
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
    // ✅ ¡CORRECCIÓN 3 (EL BUG PRINCIPAL)! Era 'orderDoc', no 'doc'
    return { id: orderDoc.id, ...orderDoc.data() };
  }

  /**
   * Actualiza el estado de un pedido y notifica al usuario.
   */
  async updateOrderStatus(restaurantId, orderId, newStatus, additionalData = {}) {
    try {
      const orderRef = db.collection('restaurants')
        .doc(restaurantId)
        .collection('orders')
        .doc(orderId);

      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) {
        throw new Error('Orden no encontrada');
      }

      const currentOrder = orderDoc.data();
      const oldStatus = currentOrder.status;

      // Actualizar el documento
      await orderRef.update({
        status: newStatus,
        updatedAt: new Date(),
        ...additionalData
      });

      console.log(`✅ Orden ${orderId} actualizada: ${oldStatus} → ${newStatus}`);

      // 🔥 ENVIAR NOTIFICACIÓN AUTOMÁTICA AL CLIENTE
      // Solo si el estado realmente cambió
      if (oldStatus !== newStatus) {
        try {
          await notificationService.notifyOrderStatusChange(
            restaurantId, 
            orderId, 
            newStatus
          );
        } catch (notifError) {
          console.error('Error enviando notificación (no crítico):', notifError);
          // No lanzar error - la actualización del pedido fue exitosa
        }
      }

      return { success: true, orderId, newStatus };

    } catch (error) {
      console.error(`Error actualizando orden ${orderId}:`, error);
      throw error;
    }
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