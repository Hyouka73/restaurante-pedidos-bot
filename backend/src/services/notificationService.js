//backend/src/services/notificationService.js
// Importar el SDK de Firebase Admin (ya debería estar disponible)
const { getMessaging } = require('firebase-admin/messaging');
const { db } = require('../config/firebase');
const { Markup } = require('telegraf');
// 🔥 --- INICIO DE LA MODIFICACIÓN --- 🔥
// Importamos las funciones que usa el bot para tener consistencia
const { formatOrderStatus } = require('../bot/handlers/myOrderHandler'); 
const notificationKeyboards = require('../bot/keyboards/notificationKeyboards');
// 🔥 --- FIN DE LA MODIFICACIÓN --- 🔥

class NotificationService {
  constructor() {
    this.bot = null; // Se inyectará desde bot.js
  }

  /**
   * 🔥 MEJORA CRÍTICA: Inyectar instancia del bot
   * Llamar esto desde bot.js después de crear el bot
   */
  setBotInstance(botInstance) {
    this.bot = botInstance;
  }

  /**
   * 🔥 MEJORA #1: NOTIFICACIONES VISUALES ATRACTIVAS
   * Envía notificación cuando cambia el estado del pedido
   */
  async notifyOrderStatusChange(restaurantId, orderId, newStatus) {
    try {
      // Obtener datos del pedido
      const orderRef = db.collection('restaurants')
        .doc(restaurantId)
        .collection('orders')
        .doc(orderId);
      
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) {
        console.error(`Orden ${orderId} no encontrada`);
        return;
      }

      const order = orderDoc.data();
      
      // Verificar si tiene notificaciones habilitadas
      if (order.notificationsEnabled === false) {
        console.log(`Notificaciones deshabilitadas para orden ${orderId}`);
        return;
      }

      const customerId = order.customer?.telegramId;
      if (!customerId) {
        console.error(`No se encontró telegramId para orden ${orderId}`);
        return;
      }

      // 🔥 --- INICIO DE LA MODIFICACIÓN --- 🔥
      
      // [ELIMINADO] const notifications = this.getStatusNotification(order, newStatus);
      // [ELIMINADO] if (!notifications) return;

      // 1. Generamos el mensaje de estado FORMATEADO (el que te gusta)
      const statusMessage = formatOrderStatus({ ...order, status: newStatus });
      
      // 2. Generamos el teclado de acciones
      const keyboard = notificationKeyboards.getOrderStatusKeyboard({ ...order, status: newStatus }, restaurantId, orderId);

      // 🔥 --- FIN DE LA MODIFICACIÓN --- 🔥

      if (order.telegramMessageId) {
        // Editamos el mensaje original del usuario
        await this.bot.telegram.editMessageText(
          customerId,
          order.telegramMessageId,
          null, 
          statusMessage, // Usamos el mensaje formateado
          {
            parse_mode: 'Markdown',
            ...keyboard // Usamos el teclado formateado
          }
        ).catch(async (err) => {
          // Fallback por si el mensaje es muy antiguo
          console.warn(`Fallo al editar mensaje ${order.telegramMessageId}, enviando uno nuevo. Error: ${err.message}`);
          await this.bot.telegram.sendMessage(customerId, statusMessage, {
            parse_mode: 'Markdown',
            ...keyboard
          });
        });
      } else {
        // Fallback si no hay messageId (ej. el usuario eligió "No" a las notificaciones)
        // No enviamos nada, para respetar la decisión del usuario.
        console.log(`No se encontró telegramMessageId para ${orderId}, no se envió notificación push.`);
      }

      console.log(`✅ Notificación (edición) enviada para orden ${orderId} (estado: ${newStatus})`);

    } catch (error) {
      console.error(`Error enviando notificación para orden ${orderId}:`, error);
    }
  }

  // ... (resto del archivo, como sendOrderReminder y sendOpeningReminderToOwner) ...
}

module.exports = new NotificationService();
