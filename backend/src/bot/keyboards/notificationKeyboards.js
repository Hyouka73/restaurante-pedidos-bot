// backend/src/bot/keyboards/notificationKeyboards.js
const { Markup } = require('telegraf');

/**
 * Mensaje que se muestra después de que el usuario elige su preferencia de notificación.
 */
function getNotificationPreferenceMessage(choice) {
    let answer = '';
    if (choice === 'yes') {
        answer = '✅ ¡Perfecto! Te mantendremos informado.';
    } else {
        answer = '👍 Entendido. Puedes usar /mipedido para ver el estado.';
    }
    const message = `${answer}\n\nPuedes usar /mipedido en cualquier momento para ver el estado de tu pedido.`;
    // No se necesita teclado aquí, es un mensaje final para esa interacción.
    return { message, keyboard: null };
}

/**
 * Genera el teclado de acciones para la vista de estado de un pedido.
 * (Extraído de la lógica manual en el handler)
 */
function getOrderStatusKeyboard(order, restaurantId, orderId) {
    const actionButtons = [];
    
    // Lógica para añadir el botón de cancelar solo si el pedido está pendiente
    if (order.status === 'pending') {
        actionButtons.push([Markup.button.callback('❌ Cancelar Pedido', `cancel_order_${restaurantId}_${orderId}`)]);
    }

    actionButtons.push([Markup.button.callback('🔄 Actualizar', `refresh_order_${restaurantId}_${orderId}`)]);
    actionButtons.push([Markup.button.callback('🧾 Ver Recibo', `show_receipt_${restaurantId}_${orderId}`)]);
    actionButtons.push([Markup.button.callback('📞 Contactar', 'show_info')]);

    return Markup.inlineKeyboard(actionButtons);
}

/**
 * Mensaje y teclado para confirmar la cancelación de un pedido.
 */
function getCancelOrderRequestMessage(restaurantId, orderId) {
    const message = `❌ *¿Seguro que quieres cancelar el pedido #${orderId.substring(0, 6)}?*\n\nEsta acción no se puede deshacer.`;
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Sí, Cancelar', `confirm_cancel_${restaurantId}_${orderId}`)],
        [Markup.button.callback('« Volver', `refresh_order_${restaurantId}_${orderId}`)]
    ]);
    return { message, keyboard };
}

/**
 * Mensaje y teclado que se muestra cuando un pedido ha sido cancelado exitosamente.
 */
function getOrderCancelledMessage() {
    const message = '❌ Tu pedido ha sido cancelado.';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Volver al inicio', 'back_to_start')]
    ]);
    return { message, keyboard };
}

/**
 * Mensaje de error si la cancelación falla.
 */
function getOrderCancelledErrorMessage() {
    return { message: '❌ Hubo un error al intentar cancelar el pedido.', keyboard: null };
}

/**
 * Mensaje que pregunta al usuario si desea recibir un recibo.
 */
function getAskForReceiptMessage(restaurantId, orderId) {
    const message = '🧾 Tu pedido ha sido confirmado. ¿Te gustaría recibir un recibo de compra?';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Sí, enviarlo', `ar_y_${restaurantId}_${orderId}`)],
        [Markup.button.callback('❌ No, gracias', `ar_n_${restaurantId}_${orderId}`)]
    ]);
    return { message, keyboard };
}


module.exports = {
    getNotificationPreferenceMessage,
    getOrderStatusKeyboard,
    getCancelOrderRequestMessage,
    getOrderCancelledMessage,
    getOrderCancelledErrorMessage,
    getAskForReceiptMessage
};