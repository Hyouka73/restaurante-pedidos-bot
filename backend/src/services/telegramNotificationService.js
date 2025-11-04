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

    // Importamos formatOrderStatus aquí para evitar problemas de dependencia circular
    const { formatOrderStatus } = require('../bot/keyboards/myOrderKeyboards');
    const { getOrderStatusKeyboard } = require('../bot/keyboards/notificationKeyboards');

    const statusMessage = formatOrderStatus({ ...orderData, status: newStatus });
    const keyboard = getOrderStatusKeyboard({ ...orderData, status: newStatus }, restaurantId, orderData.id);

    try {
      // Si existe un ID de mensaje anterior, lo borramos para generar una nueva notificación.
      if (orderData.telegramMessageId) {
        try {
          await botInstance.telegram.deleteMessage(telegramId, orderData.telegramMessageId);
        } catch (deleteError) {
          // Ignoramos si el mensaje ya fue borrado por el usuario, por ejemplo.
          console.warn(`No se pudo borrar el mensaje anterior ${orderData.telegramMessageId}: ${deleteError.message}`);
        }
      }

      // Siempre enviamos un mensaje nuevo para asegurar la notificación.
      const sentMessage = await botInstance.telegram.sendMessage(telegramId, statusMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });

      // Guardamos el ID del nuevo mensaje para poder borrarlo en la siguiente actualización.
      const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderData.id);
      await orderRef.update({ telegramMessageId: sentMessage.message_id });
      
      console.log(`Notificación de estado '${newStatus}' enviada como nuevo mensaje ${sentMessage.message_id} a ${telegramId}`);

      // Si el pedido se marca como entregado, enviamos un mensaje de agradecimiento.
      if (newStatus === 'delivered') {
        await botInstance.telegram.sendMessage(telegramId, '¡Gracias por tu compra! Esperamos verte pronto. 😊');
      }

    } catch (error) {
      console.error(`Error al enviar notificación a ${telegramId}:`, error.message);
      // Aquí podríamos añadir una lógica para reintentar o notificar al admin.
      // Por ahora, solo registramos el error para no detener el flujo.
    }
  }
}

module.exports = new TelegramNotificationService();