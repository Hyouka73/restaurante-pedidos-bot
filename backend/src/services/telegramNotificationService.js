// backend/src/services/telegramNotificationService.js
const botInstance = require('../config/telegram');

class TelegramNotificationService {
  /**
   * Envía una notificación de cambio de estado al usuario de Telegram.
   * @param {string} telegramId - El ID de chat de Telegram del usuario.
   * @param {string} newStatus - El nuevo estado del pedido (ej. 'confirmed', 'preparing', 'ready', 'delivered').
   * @param {object} orderData - Los datos del pedido.
   */
  async notifyUserOfStatusChange(telegramId, newStatus, orderData) {
    if (!telegramId || !botInstance) {
      console.error('Falta telegramId o instancia de bot para notificar.');
      return;
    }

    const orderId = orderData.id.substring(0, 8).toUpperCase();
    let message = '';

    // Genera mensajes basados en el estado
    switch (newStatus) {
      case 'confirmed':
        message = `✅ ¡Tu pedido #${orderId} ha sido *confirmado* por el restaurante!\n\nPronto comenzarán a prepararlo.`;
        break;
      
      case 'preparing':
        message = `🧑‍🍳 ¡Tu pedido #${orderId} ya se está *preparando*!`;
        break;

      // Esto cumple con el Punto 3: "informe al cliente cuando el pedido este listo"
      case 'ready':
        if (orderData.deliveryType === 'pickup') {
          message = `🎉 ¡Tu pedido #${orderId} está *listo para recoger*!\n\nPuedes pasar por él al restaurante.`;
        } else {
          message = `🚚 ¡Tu pedido #${orderId} está *listo* y ha salido a reparto!\n\nPronto llegará a tu ubicación.`;
        }
        break;
      
      // Esto cumple con el Punto 3: "agradecer por su compra"
      case 'delivered':
        message = `🏠 ¡Tu pedido #${orderId} ha sido *entregado*!\n\nMuchas gracias por tu compra. ¡Disfrútalo! 😊`;
        break;

      case 'cancelled':
        message = `❌ Lo sentimos, tu pedido #${orderId} ha sido *cancelado*.`;
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