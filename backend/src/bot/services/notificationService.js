// backend/src/bot/services/notificationService.js
const { db } = require('../../config/firebase');
const { Markup } = require('telegraf');

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

      // 🔥 MENSAJES PERSONALIZADOS POR ESTADO
      const notifications = this.getStatusNotification(order, newStatus);
      
      if (!notifications) return;

      // 🔥 MEJORA: Editar mensaje existente si es posible
      if (order.telegramMessageId) {
        // Si tenemos un messageId, editamos el mensaje original
        await this.bot.telegram.editMessageText(
          customerId,
          order.telegramMessageId,
          null, // inline_message_id
          notifications.message,
          {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(notifications.buttons)
          }
        ).catch(async (err) => {
          // Si falla la edición (ej. mensaje muy antiguo), enviar uno nuevo como respaldo
          console.warn(`Fallo al editar mensaje ${order.telegramMessageId}, enviando uno nuevo. Error: ${err.message}`);
          await this.bot.telegram.sendMessage(customerId, notifications.message, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(notifications.buttons)
          });
        });
      } else {
        // Fallback: Si no hay messageId, enviar un mensaje nuevo
        await this.bot.telegram.sendMessage(customerId, notifications.message, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(notifications.buttons)
        });
      }

      console.log(`✅ Notificación enviada para orden ${orderId} (estado: ${newStatus})`);

    } catch (error) {
      console.error(`Error enviando notificación para orden ${orderId}:`, error);
    }
  }

  /**
   * 🔥 MEJORA #2: MENSAJES CONTEXTUALES Y ATRACTIVOS
   * Genera el mensaje y botones según el estado
   */
  getStatusNotification(order, status) {
    const orderId = order.orderNumber || order.id.substring(0, 6).toUpperCase();
    const restaurantId = order.restaurantId || 'unknown';
    const fullOrderId = order.id;

    const notifications = {
      confirmed: {
        message: 
          `✅ *¡Pedido Confirmado!*\n\n` +
          `📝 Tu pedido #${orderId} ha sido confirmado por el restaurante.\n\n` +
          `👨‍🍳 Comenzaremos a prepararlo enseguida.\n` +
          `⏱️ _Tiempo estimado: 25-35 minutos_`,
        buttons: [
          [Markup.button.callback('🔎 Ver Estado', `show_order_status_${restaurantId}_${fullOrderId}`)],
          [Markup.button.callback('📞 Contactar', 'show_info')]
        ]
      },
      
      preparing: {
        message:
          `👨‍🍳 *¡Ya estamos cocinando!*\n\n` +
          `🔥 Tu pedido #${orderId} está en preparación.\n\n` +
          `⏱️ _Estará listo en 15-25 minutos_\n` +
          `🍽️ ¡La espera valdrá la pena!`,
        buttons: [
          [Markup.button.callback('🔎 Ver Detalles', `show_order_status_${restaurantId}_${fullOrderId}`)]
        ]
      },
      
      ready: {
        message:
          `🎉 *¡Tu pedido está listo!*\n\n` +
          `✅ Pedido #${orderId}\n\n` +
          (order.deliveryType === 'delivery' 
            ? `🚚 Saldrá a reparto en breve. ¡Prepárate para recibirlo!` 
            : `🏪 Puedes pasar a recogerlo cuando gustes.\n📍 ${order.restaurantAddress || 'En el restaurante'}`),
        buttons: order.deliveryType === 'delivery' 
          ? [[Markup.button.callback('📍 Seguir Pedido', `show_order_status_${restaurantId}_${fullOrderId}`)]]
          : [
              [Markup.button.callback('📞 Llamar al Restaurante', 'show_info')],
              [Markup.button.callback('🗺️ Ver Ubicación', 'show_info')]
            ]
      },
      
      delivering: {
        message:
          `🚚 *¡En camino a tu domicilio!*\n\n` +
          `📦 Pedido #${orderId}\n\n` +
          `🏃‍♂️ El repartidor está en camino\n` +
          `⏱️ _Llegará en 10-20 minutos_\n\n` +
          `📍 Dirección: ${order.info?.location?.formatted_address || 'Tu ubicación'}`,
        buttons: [
          [Markup.button.callback('🔎 Ver Estado', `show_order_status_${restaurantId}_${fullOrderId}`)],
          [Markup.button.callback('📞 Contactar', 'show_info')]
        ]
      },
      
      delivered: {
        message:
          `🏠 *¡Pedido Entregado!*\n\n` +
          `✅ Tu pedido #${orderId} ha sido entregado\n\n` +
          `🍽️ ¡Que lo disfrutes!\n` +
          `⭐ _¿Te gustó? Tu opinión nos ayuda a mejorar_`,
        buttons: [
          [Markup.button.callback('⭐ Calificar Pedido', `rate_order_${restaurantId}_${fullOrderId}`)],
          [Markup.button.callback('🛒 Pedir de Nuevo', 'init_order')]
        ]
      },
      
      cancelled: {
        message:
          `❌ *Pedido Cancelado*\n\n` +
          `Tu pedido #${orderId} ha sido cancelado.\n\n` +
          `¿Hubo algún problema? Contáctanos para ayudarte.`,
        buttons: [
          [Markup.button.callback('📞 Contactar Soporte', 'show_info')],
          [Markup.button.callback('🛒 Nuevo Pedido', 'init_order')]
        ]
      }
    };

    return notifications[status] || null;
  }

  /**
   * 🔥 MEJORA #3: RECORDATORIO PROACTIVO
   * Recordatorio de pedido "olvidado" (si el usuario no pregunta por su estado)
   */
  async sendOrderReminder(restaurantId, orderId) {
    try {
      const orderRef = db.collection('restaurants')
        .doc(restaurantId)
        .collection('orders')
        .doc(orderId);
      
      const orderDoc = await orderRef.get();
      if (!orderDoc.exists) return;

      const order = orderDoc.data();
      
      // Solo si tiene notificaciones habilitadas
      if (order.notificationsEnabled === false) return;

      const customerId = order.customer?.telegramId;
      if (!customerId) return;

      const orderId6 = order.orderNumber || order.id.substring(0, 6).toUpperCase();

      let reminderMessage = `🔔 *Recordatorio de Pedido*\n\n`;
      
      if (order.status === 'preparing') {
        reminderMessage += 
          `👨‍🍳 Tu pedido #${orderId6} sigue en preparación.\n\n` +
          `⏱️ Debería estar listo pronto. ¡Ten paciencia!`;
      } else if (order.status === 'ready') {
        reminderMessage += 
          `🎉 Tu pedido #${orderId6} está listo.\n\n` +
          (order.deliveryType === 'delivery' 
            ? `🚚 El repartidor saldrá pronto.` 
            : `🏪 ¡Puedes pasar a recogerlo!`);
      }

      await this.bot.telegram.sendMessage(
        customerId,
        reminderMessage,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🔎 Ver Estado', `show_order_status_${restaurantId}_${orderId}`)]
          ])
        }
      );

    } catch (error) {
      console.error('Error enviando recordatorio:', error);
    }
  }

  /**
   * 🔥 MEJORA #4: NOTIFICACIÓN DE APERTURA AL DUEÑO
   * (Tu código original mejorado)
   */
  async sendOpeningReminderToOwner(restaurantId, scheduledOpenTime) {
    try {
      const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
      if (!restaurantDoc.exists) {
        console.error(`Restaurante ${restaurantId} no encontrado`);
        return;
      }

      const ownerUid = restaurantDoc.data().ownerUid;
      const userDoc = await db.collection('users').doc(ownerUid).get();
      
      if (!userDoc.exists) {
        console.error(`Usuario ${ownerUid} no encontrado`);
        return;
      }

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) {
        console.warn(`Usuario ${ownerUid} no tiene FCM token`);
        return;
      }

      // 🔥 Mensaje mejorado para el dueño
      const { getMessaging } = require('firebase-admin/messaging');
      const message = {
        notification: {
          title: '⏰ ¡Hora de Abrir!',
          body: `Ya son las ${scheduledOpenTime}. ¿Todo listo para recibir pedidos?`
        },
        data: {
          type: 'opening_reminder',
          restaurantId: restaurantId,
          action: 'open_restaurant' // Para manejo en la app
        },
        token: fcmToken,
      };

      const response = await getMessaging().send(message);
      console.log('✅ Recordatorio de apertura enviado:', response);

      await db.collection('restaurants').doc(restaurantId).update({
        'availability.lastOpenReminderSent': new Date()
      });

    } catch (error) {
      console.error('Error enviando recordatorio de apertura:', error);
    }
  }
}

module.exports = new NotificationService();