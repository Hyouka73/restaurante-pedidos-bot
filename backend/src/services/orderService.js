const { db, admin } = require('../config/firebase');
// 🔥 AÑADIR AL INICIO DE LOS IMPORTS
const telegramNotificationService = require('../services/telegramNotificationService');
// Importamos el "publicador" de Redis
const { publisher } = require('../config/redisClient');

const SSE_CHANNEL = 'orders_channel';

// 🔥 --- INICIO DE LA SOLUCIÓN 5 --- 🔥

// Función auxiliar para crear notas por defecto
function generateStatusNotes(status) {
  switch (status) {
    case 'confirmed':
      return 'El restaurante confirmó el pedido.';
    case 'preparing':
      return 'El pedido entró a preparación.';
    case 'ready':
      return 'El pedido está listo para recoger/enviar.';
    case 'delivering':
      return 'El pedido salió a reparto.';
    case 'delivered':
      return 'El pedido fue entregado/recogido.';
    case 'cancelled':
      return 'El pedido fue cancelado por el restaurante.'; // O por el usuario
    default:
      return `Estado actualizado a ${status}.`;
  }
}

// 🔥 --- FIN DE LA SOLUCIÓN 5 --- 🔥

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

      // 🔥 --- INICIO DE LA SOLUCIÓN 5 (ACTUALIZACIÓN) --- 🔥
      
      // 1. Determina la nota. Usa la nota de 'additionalData' (de la app) o genera una.
      const note = additionalData.notes || generateStatusNotes(newStatus);

      // 2. Crea la nueva entrada del historial
      const newHistoryEntry = {
        status: newStatus,
        timestamp: new Date(),
        notes: note
      };

 			// 3. Actualizar el documento con 'status' Y 'statusHistory'
      await orderRef.update({
        status: newStatus,
        updatedAt: new Date(),
        // ¡Esta es la línea clave! Usa 'admin' para acceder a FieldValue.
 				statusHistory: admin.firestore.FieldValue.arrayUnion(newHistoryEntry) 
      });
      
      // 🔥 NUEVO: Enviar recibo cuando el pedido se confirma
      if (oldStatus === 'pending' && newStatus === 'confirmed') {
        try {
          console.log(`📄 Enviando recibo para orden ${orderId}...`);
          
          // Obtener datos del restaurante
          const configBotService = require('../bot/services/configBotService');
          const receiptService = require('./receiptService');
          const botService = require('./botService');
          
          const restaurantData = await configBotService.getRestaurantData(restaurantId);
          const bot = botService.getBot(restaurantId);
          
          if (!bot) {
            console.warn('Bot no disponible para enviar recibo');
            // Do not return here, let the flow continue
          } else {
            // Verificar si el usuario quiere recibo automático
            const autoSendReceipt = restaurantData.features?.autoSendReceipt || false;
            const telegramId = currentOrder.customer.telegramId;
            
            if (autoSendReceipt) {
              // Enviar recibo directamente
              const updatedOrder = await this.getOrder(restaurantId, orderId);
              const receiptHtml = receiptService.generateHtmlReceipt(updatedOrder, restaurantData);
              const receiptBuffer = Buffer.from(receiptHtml, 'utf-8');
              const orderNumber = updatedOrder.orderNumber || orderId.substring(0, 6);
              
              await bot.telegram.sendDocument(
                telegramId,
                {
                  source: receiptBuffer,
                  filename: `recibo-${orderNumber}.html`
                },
                {
                  caption: `🧾 Aquí está tu recibo de compra #${orderNumber}.\n\nÁbrelo en tu navegador para imprimir o guardar como PDF.`
                }
              );
              console.log(`✅ Recibo enviado automáticamente a ${telegramId}`);
            } else {
              // Preguntar si lo quiere
              await bot.telegram.sendMessage(
                telegramId,
                '🧾 Tu pedido ha sido confirmado. ¿Te gustaría recibir un recibo de compra?',
                {
                  reply_markup: {
                    inline_keyboard: [[
                      { text: '✅ Sí, enviarlo', callback_data: `ar_y_${restaurantId}_${orderId}` },
                      { text: '❌ No, gracias', callback_data: `ar_n_${restaurantId}_${orderId}` }
                    ]]
                  }
                }
              );
              console.log(`✅ Pregunta de recibo enviada a ${telegramId}`);
            }
          }
        } catch (receiptError) {
          console.error('Error enviando recibo (no crítico):', receiptError);
          // No lanzar error - la actualización del pedido fue exitosa
        }
      }
      // 🔥 --- FIN DE LA SOLUCIÓN 5 --- 🔥

      console.log(`✅ Orden ${orderId} actualizada: ${oldStatus} → ${newStatus}`);

      // 🔥 ENVIAR NOTIFICACIÓN AUTOMÁTICA AL CLIENTE
      // Solo si el estado realmente cambió
      if (oldStatus !== newStatus) {
        try {
          await telegramNotificationService.notifyUserOfStatusChange(
            currentOrder.customer.telegramId, // 1. telegramId
            newStatus,                        // 2. newStatus
            { id: orderId, ...currentOrder }, // 3. orderData (¡con el ID!)
            restaurantId                      // 4. restaurantId
          );
        } catch (notifError) {
          console.error('Error enviando notificación (no crítico):', notifError);
          // No lanzar error - la actualización del pedido fue exitosa
        }
      }

      // Publicar actualización en Redis para SSE
      try {
        const { publisher } = require('../config/redisClient');
        const SSE_CHANNEL = 'orders_channel';
        
        const updatedOrder = await this.getOrder(restaurantId, orderId);
        const message = JSON.stringify({ 
          type: 'order_update', 
          payload: updatedOrder 
        });
        await publisher.publish(SSE_CHANNEL, message);
        console.log(`[OrderService] Publicado 'order_update' en ${SSE_CHANNEL}`);
      } catch (sseError) {
        console.error('[OrderService] Error publicando actualización en Redis:', sseError);
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

    allActiveOrders.sort((a, b) => {
      // Asegurarse de que createdAt es un objeto Date para comparar
      const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    });

    return allActiveOrders;
  }
}

module.exports = new OrderService();