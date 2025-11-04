// backend/src/bot/keyboards/myOrderKeyboards.js
const { Markup } = require('telegraf');

function getNoActiveOrdersMessage() {
    const message = '🤔 *No tienes pedidos activos*\n\n' +
        '¿Tienes hambre? ¡Hagamos un nuevo pedido!';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛒 Hacer Pedido', 'init_order')],
        [Markup.button.callback('📋 Ver Menú', 'show_menu')]
    ]);
    return { message, keyboard };
}

function getSingleOrderMessage(order) {
    const statusMessage = formatOrderStatus(order);
    const actionButtons = [];

    if (order.status === 'pending') {
        actionButtons.push([Markup.button.callback('❌ Cancelar Pedido', `cancel_order_${order.restaurantId}_${order.id}`)]);
    }

    actionButtons.push([Markup.button.callback('🔄 Actualizar Estado', `refresh_order_${order.restaurantId}_${order.id}`)]);
    actionButtons.push([Markup.button.callback('📞 Contactar Restaurante', 'show_info')]);

    const keyboard = Markup.inlineKeyboard(actionButtons);
    return { message: statusMessage, keyboard };
}

function getMultipleOrdersMessage(activeOrders) {
    let listMessage = '📦 *Tus Pedidos Activos*\n\n';
    const buttons = activeOrders.map((order, idx) => {
        const orderId = order.orderNumber || order.id.substring(0, 6).toUpperCase();
        const statusEmoji = {
            pending: '⏳', confirmed: '✅', preparing: '👨‍🍳',
            ready: '🎉', delivering: '🚚', delivered: '🏠'
        }[order.status] || '📦';

        const firstItem = order.items[0]?.name || 'Pedido';
        const moreItems = order.items.length > 1 ? ` +${order.items.length - 1}` : '';

        listMessage += `${idx + 1}. ${statusEmoji} #${orderId} - ${firstItem}${moreItems}\n`;

        return [Markup.button.callback(
            `${statusEmoji} Ver Pedido #${orderId}`,
            `s_o_s_${order.restaurantId}_${order.id}`
        )];
    });

    listMessage += `\n👇 Selecciona un pedido para ver detalles:`;
    const keyboard = Markup.inlineKeyboard(buttons);
    return { message: listMessage, keyboard };
}

function getErrorMessage() {
    const message = '❌ *Ups, algo salió mal*\n\n' +
        'No pudimos consultar tus pedidos. Por favor intenta nuevamente.';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Reintentar', 'retry_my_order')],
        [Markup.button.callback('🏠 Inicio', 'back_to_start')]
    ]);
    return { message, keyboard };
}

function formatOrderStatus(order) {
    const orderId = order.orderNumber || order.id.substring(0, 6).toUpperCase();

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

    const stages = ['pending', 'confirmed', 'preparing', order.deliveryType === 'delivery' ? 'delivering' : 'ready', order.deliveryType === 'delivery' ? 'delivered' : 'ready'];
    const currentIndex = stages.indexOf(order.status);

    let progressBar = '';
    stages.forEach((stage, idx) => {
        if (idx < currentIndex) {
            progressBar += '✅ ';
        } else if (idx === currentIndex) {
            progressBar += `${currentStatus.emoji} `;
        } else {
            progressBar += '⚪ ';
        }
    });

    let message = `${currentStatus.color} *Pedido #${orderId}*\n\n`;
    message += `${progressBar}\n\n`;
    message += `📍 *Estado Actual:* ${currentStatus.emoji} ${currentStatus.text}\n\n`;

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
        message += `⏱️ _${estimate.text}_
`;
        if (estimate.time !== 'Completado' && estimate.time !== 'Ya disponible') {
            message += `🕐 Tiempo estimado: *${estimate.time}*\n`;
        }
    }

    message += `\n${'─'.repeat(20)}\n`;
    message += `🍽️ *Resumen:*
`;

    const itemsToShow = order.items.slice(0, 3);
    itemsToShow.forEach(item => {
        message += `   • ${item.quantity}x ${item.name}\n`;
    });

    if (order.items.length > 3) {
        message += `   _...y ${order.items.length - 3} más_\n`;
    }

    message += `\n💰 *Total:* $${order.total.toFixed(2)}`;

    if (order.deliveryType === 'delivery' && order.info?.location?.formatted_address) {
        message += `\n📍 Dirección: ${order.info.location.formatted_address.substring(0, 40)}...`;
    }

    return message;
}

module.exports = {
    getNoActiveOrdersMessage,
    getSingleOrderMessage,
    getMultipleOrdersMessage,
    getErrorMessage,
    formatOrderStatus
};
