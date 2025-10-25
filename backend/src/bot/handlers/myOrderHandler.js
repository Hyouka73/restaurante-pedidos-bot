// backend/src/bot/handlers/myOrderHandler.js
const orderService = require('../../services/orderService');
const telegramUserService = require('../services/telegramUserService');

/**
 * Formatea el estado del pedido para el usuario.
 */
function formatOrderStatus(order) {
  const orderId = order.id.substring(0, 8).toUpperCase();
  let message = `🔎 *Estado de tu Pedido Activo* (#${orderId})\n\n`;
  
  // Mensajes amigables + "cuanto tiempo falta" (estimado)
  switch (order.status) {
    case 'pending':
      message += `⏳ *Estado:* Pendiente de confirmación.\nEl restaurante aún no ha aceptado tu pedido.`;
      break;
    case 'confirmed':
      message += `✅ *Estado:* Confirmado.\nEl restaurante está por iniciar la preparación. (Estimado: 25-35 min)`;
      break;
    case 'preparing':
      message += `🧑‍🍳 *Estado:* ¡En preparación!\nTu comida se está cocinando. (Estimado: 15-25 min)`;
      break;
    case 'ready':
      if (order.deliveryType === 'pickup') {
        message += `🎉 *Estado:* ¡Listo para Recoger!\nPuedes pasar por él cuando gustes.`;
      } else {
        message += `🚚 *Estado:* ¡Listo! En camino.\nEl repartidor debería llegar pronto.`;
      }
      break;
    default:
      message += `❓ *Estado:* ${order.status}`;
  }
  
  message += `\n\n💰 *Total:* ${order.total}`;
  return message;
}

module.exports = async (ctx) => {
  try {
    const userId = ctx.from.id;
    
    // Identificar el restaurante
    const restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
    if (!restaurantId) {
      await ctx.reply('⚠️ No se pudo identificar el restaurante. Usa /start primero.');
      return;
    }

    // Buscar pedido activo
    const activeOrder = await orderService.getActiveOrderByUser(restaurantId, userId);

    if (!activeOrder) {
      await ctx.reply('🤔 No tienes ningún pedido activo en este momento.\n\n¡Puedes iniciar uno nuevo con /pedido!');
      return;
    }

    // Mostrar estado del pedido
    const statusMessage = formatOrderStatus(activeOrder);
    await ctx.reply(statusMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error en myOrderHandler:', error);
    await ctx.reply('❌ Hubo un error al consultar tu pedido. Por favor intenta nuevamente.');
  }
};
