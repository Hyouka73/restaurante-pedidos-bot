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
        pending: { emoji: '⏳', text: 'Pendiente', color: '⚪' },
        confirmed: { emoji: '✅', text: 'Confirmado', color: '🟢' },
        preparing: { emoji: '👨‍🍳', text: 'En preparación', color: '🟠' },
        ready: { emoji: '🎉', text: '¡Listo para recoger!', color: '🟢' },
        delivering: { emoji: '🚚', text: 'En camino', color: '🔵' },
        delivered: { emoji: '🏠', text: 'Entregado', color: '✅' },
        cancelled: { emoji: '❌', text: 'Cancelado', color: '🔴' }
    };
    
    const currentStatusInfo = statusMap[order.status] || { emoji: '❓', text: order.status, color: '⚪' };

    // Define los pasos del proceso
    const stages = ['pending', 'confirmed', 'preparing'];
    if (order.deliveryType === 'delivery') {
        stages.push('delivering', 'delivered');
    } else {
        stages.push('ready'); // Para pickup, 'ready' es el final
    }

    const currentIndex = stages.indexOf(order.status);

    // Construye la barra de progreso
    let progressBar = stages.map((stage, idx) => {
        if (currentIndex > -1 && idx < currentIndex) {
            return '🟢'; // Estado pasado
        } else if (idx === currentIndex) {
            return currentStatusInfo.color; // Estado actual
        } else {
            return '⚪'; // Estado futuro
        }
    }).join(' ');

    // Mensaje de estado
    const timeEstimates = {
        pending: 'Esperando confirmación...', 
        confirmed: 'Pronto comenzarán a prepararlo.',
        preparing: '¡Tu pedido ya se está preparando!',
        ready: '¡Puedes pasar a recogerlo!',
        delivering: 'El repartidor está en camino.',
        delivered: '¡Disfruta tu comida!',
        cancelled: 'El pedido ha sido cancelado.'
    };
    const statusLine = timeEstimates[order.status] || '';

    // Construcción del mensaje final
    let message = `*Pedido #${orderId}*\n\n`;
    message += `${progressBar}\n\n`;
    message += `📍 *Estado Actual:* ${currentStatusInfo.emoji} ${currentStatusInfo.text}\n`;
    message += `⏱️ ${statusLine}\n\n`;
    message += `────────────────────\n`;
    message += `🍽️ *Resumen:*\n`;

    order.items.forEach(item => {
        message += `• ${item.quantity}x ${item.name}\n`;
    });

    if (order.items.length > 3) {
        message += `   _...y ${order.items.length - 3} más_\n`;
    }

    message += `\n💰 *Total:* $${order.total.toFixed(2)}`;

    return message;
}

module.exports = {
    getNoActiveOrdersMessage,
    getSingleOrderMessage,
    getMultipleOrdersMessage,
    getErrorMessage,
    formatOrderStatus
};