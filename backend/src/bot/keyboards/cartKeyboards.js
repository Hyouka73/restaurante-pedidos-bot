// backend/src/bot/keyboards/cartKeyboards.js
const { Markup } = require('telegraf');

function getEmptyCartMessage() {
    const message = '🛒 *Carrito Vacío*\n\n¿Ver el menú?';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📋 Ver Menú', 'back_to_menu')],
        [Markup.button.callback('🏠 Inicio', 'back_to_start')]
    ]);
    return { message, keyboard };
}

function getCartViewMessage(session) {
    const subtotal = session.subtotal || session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discount = session.discount;
    const total = session.total || subtotal;

    let cartMessage = '🛒 *Tu Carrito*\n\n';

    session.items.forEach((item, index) => {
        const itemType = item.type === 'combo' ? '🎁' : '🍽️';
        cartMessage += `${itemType} *${item.name}*\n`;
        const price = item.price || 0;
        const itemTotal = (price * item.quantity);
        cartMessage += `${item.quantity}x = $${itemTotal.toFixed(2)}\n\n`;
    });

    cartMessage += `💰 Subtotal: $${subtotal.toFixed(2)}\n`;

    if (discount && discount.amount > 0) {
        cartMessage += `🎉 Promo: -$${discount.amount.toFixed(2)}\n`;
    }

    cartMessage += `*TOTAL: $${total.toFixed(2)}*`;

    const buttons = [];

    session.items.forEach((item, index) => {
        buttons.push([
            Markup.button.callback('➖', `qty_decrease_${index}`),
            Markup.button.callback(`${item.name} (${item.quantity}x)`, `item_info_${item.id}`),
            Markup.button.callback('➕', `qty_increase_${index}`),
            Markup.button.callback('🗑️', `remove_${index}`)
        ]);
    });

    buttons.push([Markup.button.callback('📋 Agregar más', 'back_to_menu')]);
    buttons.push([
        Markup.button.callback('✅ Continuar', 'continue_to_delivery'),
        Markup.button.callback('🗑️ Vaciar Todo', 'confirm_clear_cart')
    ]);

    const keyboard = Markup.inlineKeyboard(buttons);
    return { message: cartMessage, keyboard };
}

function getConfirmClearCartMessage() {
    const message = '🗑️ *¿Vaciar todo el carrito?*';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Sí, Vaciar', 'clear_cart')],
        [Markup.button.callback('❌ No, Volver', 'view_cart')]
    ]);
    return { message, keyboard };
}

function getDeliveryOptionsMessage(features, delivery) {
    const buttons = [];
    if (features.deliveryEnabled && delivery.enabled) {
        buttons.push([Markup.button.callback('🏠 A Domicilio', 'delivery_yes')]);
    }
    if (features.pickupEnabled) {
        buttons.push([Markup.button.callback('🏪 Recoger en Tienda', 'pickup')]);
    }

    if (buttons.length === 0) {
        return { message: '⚠️ No hay métodos de entrega configurados.', keyboard: null };
    }

    buttons.push([Markup.button.callback('« Volver', 'view_cart')]);
    const message = '🚀 *¿Cómo recibes tu pedido?*';
    const keyboard = Markup.inlineKeyboard(buttons);
    return { message, keyboard };
}

function getAskForLocationMessage() {
    const message = '📍 *Comparte tu ubicación*\n\nUsa el botón de abajo o el clip 📎';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🏪 Cambiar a Recoger', 'change_to_pickup')],
        [Markup.button.callback('❌ Cancelar', 'cancel_order')]
    ]);
    const locationRequestKeyboard = Markup.keyboard([
        [Markup.button.locationRequest('📍 Compartir Ubicación')]
    ]).oneTime().resize();

    return { message, keyboard, locationRequestKeyboard };
}

function getPickupMessage(restaurantData) {
    const address = restaurantData.info?.address || 'Dirección no disponible';
    const message = `🏪 *Recogerás en Tienda*\n\n📍 ${address}\n\n⏱️ Listo en 20-30 min`;
    return { message, keyboard: Markup.inlineKeyboard([]) };
}

function getFinalConfirmationMessage(session) {
    const subtotal = session.subtotal || 0;
    const deliveryFee = session.delivery?.fee || 0;
    const discount = session.discount;
    const total = session.total || (subtotal + deliveryFee);

    let confirmMessage = '📋 *Resumen Final*\n\n';
    confirmMessage += '🛒 *Items:*\n';
    session.items.forEach(item => {
        confirmMessage += `• ${item.name} (${item.quantity}x) - $${((item.price || 0) * item.quantity).toFixed(2)}\n`;
    });

    confirmMessage += `\n💰 Subtotal: $${subtotal.toFixed(2)}\n`;

    if (session.deliveryType === 'delivery') {
        confirmMessage += `🚚 Envío: $${deliveryFee.toFixed(2)}\n`;
    }

    if (discount && discount.amount > 0) {
        confirmMessage += `🎉 Promo: -$${discount.amount.toFixed(2)}\n`;
    }

    confirmMessage += `\n*TOTAL: $${total.toFixed(2)}*\n\n`;
    confirmMessage += `📍 ${session.deliveryType === 'delivery' ? '🏠 Domicilio' : '🏪 Recoger'}\n`;
    if (session.customerPhone) {
        confirmMessage += `📞 ${session.customerPhone}\n`;
    }
    confirmMessage += `💳 ${session.paymentMethod?.name || 'No seleccionado'}\n`;
    confirmMessage += `⏱️ 25-35 min`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Confirmar', 'confirm_final')],
        [Markup.button.callback('✏️ Editar', 'view_cart')],
        [Markup.button.callback('❌ Cancelar', 'cancel_order')]
    ]);

    return { message: confirmMessage, keyboard };
}

function getOrderConfirmedMessage(order, total, restaurantId) {
    const orderId = order.orderNumber || order.id.substring(0, 8).toUpperCase();
    const message = `✅ *¡Pedido Enviado!*\n\n` +
        `📝 Pedido #${orderId}\n` +
        `💰 Total: *$${total.toFixed(2)}*\n` +
        `⏳ Esperando confirmación del restaurante...\n\n` +
        `Te notificaremos cuando tu pedido sea confirmado.`;
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔎 Ver Estado', `s_o_s_${restaurantId}_${order.id}`)],
        [Markup.button.callback('🏠 Inicio', 'back_to_start')]
    ]);

    const notificationMessage = '🔔 ¿Quieres recibir notificaciones cuando tu pedido cambie de estado?';
    const notificationKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('👍 Sí, notificarme', `not_y_${restaurantId}_${order.id}`)],
        [Markup.button.callback('👎 No, gracias', `not_n_${restaurantId}_${order.id}`)]
    ]);

    return { message, keyboard, notificationMessage, notificationKeyboard };
}

function getCancelOrderConfirmationMessage() {
    const message = '❌ *¿Cancelar el pedido?*';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Sí', 'confirm_cancel_order_action')],
        [Markup.button.callback('⬅️ No', 'view_cart')]
    ]);
    return { message, keyboard };
}

function getOrderCancelledMessage() {
    return { message: '❌ Tu pedido ha sido cancelado.', keyboard: null };
}

module.exports = {
    getEmptyCartMessage,
    getCartViewMessage,
    getConfirmClearCartMessage,
    getDeliveryOptionsMessage,
    getAskForLocationMessage,
    getPickupMessage,
    getFinalConfirmationMessage,
    getOrderConfirmedMessage,
    getCancelOrderConfirmationMessage,
    getOrderCancelledMessage
};
