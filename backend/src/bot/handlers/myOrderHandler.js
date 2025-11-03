// backend/src/bot/handlers/myOrderHandler.js
const { Markup } = require('telegraf');
const orderService = require('../../services/orderService');

/**
 * 🔥 MEJORA #1: FEEDBACK VISUAL CON EMOJIS ANIMADOS
 * Formatea el estado con "progreso visual" usando emojis
 */
function formatOrderStatus(order) {
  const orderId = order.orderNumber || order.id.substring(0, 6).toUpperCase();
  
  // Mapa de estados con emojis más expresivos
  const statusMap = {
    pending: { emoji: '⏳', text: 'Pendiente', color: '🟡' },
    confirmed: { emoji: '✅', text: 'Confirmado', color: '🟢' },
    preparing: { emoji: '👨‍🍳', text: 'En preparación', color: '🟠' },
    ready: { emoji: '🎉', text: '¡Listo!', color: '🟢' },
    delivering: { emoji: '🚚', text: 'En camino', color: '🔵' },
    delivered: { emoji: '🏠', text: 'Entregado', color: '✅' },
    cancelled: { emoji: '❌', text: 'Cancelado', color: '🔴' }
  };

  const currentStatus = statusMap[order.status] || { emoji: '❓', text: order.status, color: '⚪' };
  
  // 🔥 BARRA DE PROGRESO VISUAL
  const stages = ['pending', 'confirmed', 'preparing', order.deliveryType === 'delivery' ? 'delivering' : 'ready', order.deliveryType === 'delivery' ? 'delivered' : 'ready'];
  const currentIndex = stages.indexOf(order.status);
  
  let progressBar = '';
  stages.forEach((stage, idx) => {
    if (idx < currentIndex) {
      progressBar += '✅ '; // Completado
    } else if (idx === currentIndex) {
      progressBar += `${currentStatus.emoji} `; // Actual
    } else {
      progressBar += '⚪ '; // Pendiente
    }
  });

  let message = `${currentStatus.color} *Pedido #${orderId}*\n\n`;
  message += `${progressBar}\n\n`; // Barra de progreso
  message += `📍 *Estado Actual:* ${currentStatus.emoji} ${currentStatus.text}\n\n`;

  // 🔥 MEJORA #2: ESTIMACIONES DINÁMICAS Y CONTEXTUALES
  const timeEstimates = {
    pending: { text: 'Esperando confirmación del restaurante', time: '2-5 min' },
    confirmed: { text: 'Iniciando preparación', time: '25-35 min' },
    preparing: { text: 'Tu comida se está cocinando', time: '15-25 min' },
    ready: { 
      text: order.deliveryType === 'delivery' ? 'Saliendo a reparto' : '¡Puedes recogerlo ahora!', 
      time: order.deliveryType === 'delivery' ? '10-20 min' : 'Ya disponible' 
    },
    delivering: { text: 'El repartidor está en camino', time: '5-15 min' },
    delivered: { text: '¡Disfruta tu comida!', time: 'Completado' }
  };

  const estimate = timeEstimates[order.status];
  if (estimate) {
    message += `⏱️ _${estimate.text}_\n`;
    if (estimate.time !== 'Completado' && estimate.time !== 'Ya disponible') {
      message += `🕐 Tiempo estimado: *${estimate.time}*\n`;
    }
  }

  // 🔥 MEJORA #3: RESUMEN COMPACTO Y VISUAL
  message += `\n${'─'.repeat(20)}\n`;
  message += `🍽️ *Resumen:*\n`;
  
  // Mostrar solo los 3 primeros items para evitar spam
  const itemsToShow = order.items.slice(0, 3);
  itemsToShow.forEach(item => {
    message += `   • ${item.quantity}x ${item.name}\n`;
  });
  
  if (order.items.length > 3) {
    message += `   _...y ${order.items.length - 3} más_\n`;
  }
  
  message += `\n💰 *Total:* $${order.total.toFixed(2)}`;
  
  // Info de entrega solo si es relevante
  if (order.deliveryType === 'delivery' && order.info?.location?.formatted_address) {
    message += `\n📍 Dirección: ${order.info.location.formatted_address.substring(0, 40)}...`;
  }

  return message;
}

/**
 * 🔥 MEJORA #4: MANEJO INTELIGENTE DE MÚLTIPLES PEDIDOS
 */
const mainMyOrderHandler = async (ctx) => {
  try {
    const userId = ctx.from.id;

    // 🔥 Mostrar "typing" para feedback inmediato
    await ctx.replyWithChatAction('typing');

    const activeOrders = await orderService.getAllActiveOrdersByUser(userId);

    // 🔥 CASO 1: Sin pedidos - Llamado a la acción claro
    if (!activeOrders || activeOrders.length === 0) {
      await ctx.reply(
        '🤔 *No tienes pedidos activos*\n\n' +
        '¿Tienes hambre? ¡Hagamos un nuevo pedido!',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🛒 Hacer Pedido', 'init_order')],
            [Markup.button.callback('📋 Ver Menú', 'show_menu')]
          ])
        }
      );
      return;
    }

    // 🔥 CASO 2: Un solo pedido - Mostrar inmediatamente con acciones
    if (activeOrders.length === 1) {
      const order = activeOrders[0];
      const statusMessage = formatOrderStatus(order);
      
      // Botones contextuales según el estado
      const actionButtons = [];
      
      if (order.status === 'pending') { // [cite]187[/cite]
        actionButtons.push([Markup.button.callback('❌ Cancelar Pedido', `cancel_order_${order.restaurantId}_${order.id}`)]);
      }
      
      actionButtons.push([Markup.button.callback('🔄 Actualizar Estado', `refresh_order_${order.restaurantId}_${order.id}`)]);
      actionButtons.push([Markup.button.callback('📞 Contactar Restaurante', 'show_info')]);
      
      await ctx.reply(statusMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(actionButtons)
      });
      return;
    }

    // 🔥 CASO 3: Múltiples pedidos - Lista compacta y visual
    let listMessage = '📦 *Tus Pedidos Activos*\n\n';
    
    const buttons = activeOrders.map((order, idx) => {
      const orderId = order.orderNumber || order.id.substring(0, 6).toUpperCase();
      const statusEmoji = {
        pending: '⏳', confirmed: '✅', preparing: '👨‍🍳',
        ready: '🎉', delivering: '🚚', delivered: '🏠'
      }[order.status] || '📦';
      
      // Resumen ultra-compacto
      const firstItem = order.items[0]?.name || 'Pedido';
      const moreItems = order.items.length > 1 ? ` +${order.items.length - 1}` : '';
      
      listMessage += `${idx + 1}. ${statusEmoji} #${orderId} - ${firstItem}${moreItems}\n`;
      
      return [Markup.button.callback(
        `${statusEmoji} Ver Pedido #${orderId}`,
        `s_o_s_${order.restaurantId}_${order.id}` // 🔥 CORRECCIÓN: Acortar el callback_data para evitar error de 64 bytes.
      )];
    });

    listMessage += `\n👇 Selecciona un pedido para ver detalles:`;

    await ctx.reply(listMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });

  } catch (error) {
    console.error('Error en myOrderHandler:', error);
    await ctx.reply(
      '❌ *Ups, algo salió mal*\n\n' +
      'No pudimos consultar tus pedidos. Por favor intenta nuevamente.',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Reintentar', 'retry_my_order')],
          [Markup.button.callback('🏠 Inicio', 'back_to_start')]
        ])
      }
    );
  }
};

module.exports = mainMyOrderHandler;
module.exports.formatOrderStatus = formatOrderStatus;