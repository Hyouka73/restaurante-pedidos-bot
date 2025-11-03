// backend/src/services/telegramNotificationService.js
const botInstance = require('../config/telegram');
const { db } = require('../config/firebase');

class TelegramNotificationService {
  /**
   * Envía una notificación de cambio de estado al usuario de Telegram.
   * @param {string} telegramId - El ID de chat de Telegram del usuario.
   * @param {string} newStatus - El nuevo estado del pedido (ej. 'confirmed', 'preparing', 'ready', 'delivered').
   * @param {object} orderData - Los datos del pedido.
   * @param {string} restaurantId - El ID del restaurante.
   */
  async notifyUserOfStatusChange(telegramId, newStatus, orderData, restaurantId) {
    if (!telegramId || !botInstance) {
      console.error('Falta telegramId o instancia de bot para notificar.');
      return;
    }

    let restaurantName = 'el restaurante';
    if (restaurantId) {
        const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
        if (restaurantDoc.exists) {
            restaurantName = restaurantDoc.data().info.name;
        }
    }

    const orderIdShort = orderData.orderNumber || orderData.id.substring(0, 8).toUpperCase();
    let message = '';

    const formatItems = (items) => {
      if (!items || items.length === 0) return 'No hay artículos en este pedido.';
      return items.map(item => `- ${item.name} (x${item.quantity}) - ${item.price.toFixed(2)}`).join('\n');
    };

    // Genera mensajes basados en el estado
    switch (newStatus) {
      case 'confirmed':
        message = `✅ ¡Tu pedido #${orderIdShort} ha sido *confirmado* por ${restaurantName}!\n\nPronto comenzarán a prepararlo.`;
        break;
      
      case 'preparing':
        message = `🧑‍🍳 ¡Tu pedido #${orderIdShort} ya se está *preparando*!`;
        break;

      case 'ready':
        if (orderData.deliveryType === 'pickup') {
          message = `🎉 ¡Tu pedido #${orderIdShort} está *listo para recoger*!\n\nPuedes pasar por él a ${restaurantName}.`;
        } else {
          message = `✅ ¡Tu pedido #${orderIdShort} está *listo*!\n\nEstamos preparando tu envío. Te notificaremos cuando salga a reparto.`;
        }
        break;

      case 'delivering': // NUEVO ESTADO
        const itemsSummary = formatItems(orderData.items);
        const address = orderData.info?.location?.formatted_address || orderData.customer?.address || 'Dirección no especificada';
        message = `🚚 ¡Tu pedido #${orderIdShort} ha salido a reparto!\n\n*Resumen de tu pedido:*\n${itemsSummary}\n\n*Dirección de entrega:*\n${address}\n\nTotal: ${orderData.total.toFixed(2)}\n\nPronto llegará a tu ubicación.`;
        break;
      
      case 'delivered':
        message = `🏠 ¡Tu pedido #${orderIdShort} ha sido *entregado*!\n\nMuchas gracias por tu compra en *${restaurantName}*. ¡Disfrútalo! 😊`;
        break;

      case 'cancelled':
        message = `❌ Lo sentimos, tu pedido #${orderIdShort} ha sido *cancelado*.`;
        break;
      
      default:
        // No notificar en otros estados (ej. 'pending')
        return;
    }

    try {
      // Usamos la API de Telegraf para enviar el mensaje directamente al chat del usuario
      await botInstance.telegram.sendMessage(telegramId, message, {
        parse_mode: 'Markdown'
      });
      console.log(`Notificación de estado '${newStatus}' enviada a ${telegramId}`);
    } catch (error) {
      console.error(`Error al enviar notificación a ${telegramId}:`, error.message);
      // Manejar errores (ej. el usuario bloqueó el bot)
    }
  }
}

module.exports = new TelegramNotificationService();