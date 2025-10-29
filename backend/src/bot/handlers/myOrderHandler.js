// backend/src/bot/handlers/myOrderHandler.js
const { Markup } = require('telegraf');
const orderService = require('../../services/orderService');

/**
 * Formatea el estado de un pedido para mostrarlo al usuario.
 */
function formatOrderStatus(order) {
  const orderId = order.orderNumber || order.id.substring(0, 6).toUpperCase();
  let message = `🔎 *Estado de tu Pedido #${orderId}*

`;

  const statusMap = {
    pending: '⏳ Pendiente de confirmación',
    confirmed: '✅ Confirmado',
    preparing: '🧑‍🍳 En preparación',
    ready: '🎉 ¡Listo para recoger!',
    delivering: '🚚 En camino',
    delivered: '🏠 Entregado',
    cancelled: '❌ Cancelado'
  };

  message += `*Estado:* ${statusMap[order.status] || order.status}\n`;

  // Estimaciones de tiempo
  if (order.status === 'confirmed') {
    message += `_El restaurante está por iniciar la preparación (tiempo estimado: 25-35 min)._`;
  } else if (order.status === 'preparing') {
    message += `_Tu comida se está cocinando (tiempo estimado: 15-25 min)._`;
  } else if (order.status === 'ready' && order.deliveryType === 'delivery') {
    message = message.replace('¡Listo para recoger!', '¡Listo para envío!');
    message += `_Tu pedido saldrá a reparto pronto._`;
  } else if (order.status === 'delivering') {
    message += `_El repartidor llegará en breve._`;
  }

  const itemsSummary = order.items.map(item => `${item.quantity}x ${item.name}`).join(', ');
  message += `
*Contenido:* ${itemsSummary}`;
  message += `
💰 *Total:* $${order.total.toFixed(2)}`;

  return message;
}

// Renombramos la función principal
const mainMyOrderHandler = async (ctx) => {
  try {
    const userId = ctx.from.id;

    const activeOrders = await orderService.getAllActiveOrdersByUser(userId);

    if (!activeOrders || activeOrders.length === 0) {
      await ctx.reply('🤔 No tienes ningún pedido activo en este momento.\n\n¡Puedes iniciar uno nuevo con el comando /pedido!');
      return;
    }

    if (activeOrders.length === 1) {
      const order = activeOrders[0];
      const statusMessage = formatOrderStatus(order);
      await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
      return;
    }

    // Multiple active orders
    const buttons = activeOrders.map(order => {
      const orderId = order.orderNumber || order.id.substring(0, 6).toUpperCase();
      const itemsSummary = order.items.map(item => item.name).join(', ').substring(0, 30);
      return [Markup.button.callback(
        `Pedido #${orderId} (${itemsSummary}...)`,
        `show_order_status_${order.restaurantId}_${order.id}`
      )];
    });

    await ctx.reply('Tienes varios pedidos activos. ¿Cuál deseas consultar?', Markup.inlineKeyboard(buttons));

  } catch (error) {
    console.error('Error en myOrderHandler:', error);
    await ctx.reply('❌ Hubo un error al consultar tu pedido. Por favor intenta nuevamente.');
  }
};

// Exporta el handler principal por defecto
module.exports = mainMyOrderHandler; 

// Exporta la función de formato de forma nombrada
module.exports.formatOrderStatus = formatOrderStatus;