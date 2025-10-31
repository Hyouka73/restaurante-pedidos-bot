// Este es un ARCHIVO NUEVO: backend/src/bot/handlers/notificationHandler.js

const { db } = require('../../config/firebase');
const orderService = require('../../services/orderService');
const { formatOrderStatus } = require('./myOrderHandler');

// Comandos para actualizar el menú del bot
const defaultCommands = [
    { command: 'start', description: 'Iniciar conversación' },
    { command: 'menu', description: 'Ver menú completo' },
    { command: 'pedido', description: 'Hacer un pedido' },
];

const commandsWithMyOrder = [
    ...defaultCommands,
    { command: 'mipedido', description: 'Ver estado de mi pedido' },
];

/**
 * Maneja la preferencia de notificación del usuario (sí/no) después de confirmar un pedido.
 */
async function handleNotificationPreference(ctx, callbackData) {
  const [, choice, restaurantId, orderId] = callbackData.split('_');
  const userId = ctx.from.id;
  await ctx.answerCbQuery();
  
  try {
    if (choice === 'yes') {
      // ✅ CORRECCIÓN: Usar la lista de comandos que SÍ incluye /mipedido.
      // El usuario acaba de crear un pedido, por lo que debe tener este comando.
      await ctx.telegram.setMyCommands(commandsWithMyOrder, { 
        scope: { type: 'chat', chat_id: userId } 
      });
      await ctx.editMessageText(
        '✅ ¡Perfecto! Te mantendremos informado sobre tu pedido.', 
        { reply_markup: null }
      );
    } else if (choice === 'no') {
      const orderRef = db.collection('restaurants')
        .doc(restaurantId)
        .collection('orders')
        .doc(orderId);
      await orderRef.update({ notificationsEnabled: false });
      
      await ctx.telegram.setMyCommands(commandsWithMyOrder, { 
        scope: { type: 'chat', chat_id: userId } 
      });
      await ctx.editMessageText(
        '👍 Entendido. No te enviaremos notificaciones automáticas.', 
        { reply_markup: null }
      );
      await ctx.reply(
        'Puedes consultar el estado de tu pedido en cualquier momento con el comando /mipedido.'
      );
    }
  } catch (error) {
    console.error('Error updating notification preference:', error);
    await ctx.reply('❌ Hubo un error al guardar tu preferencia.');
  }
}
/**
 * Maneja el callback para mostrar el estado de un pedido específico (cuando hay múltiples pedidos).
 */
async function handleShowOrderStatus(ctx, callbackData) {
  const [, , restaurantId, orderId] = callbackData.split('_');
  await ctx.answerCbQuery();
  
  try {
    const order = await orderService.getOrder(restaurantId, orderId);
    const statusMessage = formatOrderStatus(order);
    await ctx.editMessageText(statusMessage, { 
      parse_mode: 'Markdown', 
      reply_markup: null 
    });
  } catch (error) {
    console.error('Error showing order status:', error);
    await ctx.reply('❌ Hubo un error al consultar el estado de tu pedido.');
  }
}


module.exports = {
    handleNotificationPreference,
    handleShowOrderStatus
};