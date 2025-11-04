// backend/src/bot/keyboards/orderKeyboards.js
const { Markup } = require('telegraf');

function getOutOfDeliveryRangeMessage(result, restaurantData) {
    const message = '😔 Lo sentimos, tu ubicación está fuera de nuestra zona de entrega.\n\n' +
        `📏 Distancia: ${result.distanceKm.toFixed(2)} km\n` +
        `🚗 Máxima distancia: ${restaurantData.delivery?.maxDistance || 10} km\n\n` +
        '¿Deseas cambiar a *Recoger en tienda*?';
        
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🏪 Recoger en tienda', 'change_to_pickup')],
        [Markup.button.callback('❌ Cancelar pedido', 'cancel_order')]
    ]);
    
    return { message, keyboard };
}

function getFreeDeliveryMessage(result, subtotal, freeDeliveryMin) {
    const message = `🎉 ¡Felicidades! Tu pedido califica para *envío gratis*\n\n` +
        `📏 Distancia: ${result.distanceKm.toFixed(2)} km\n` +
        `💰 Costo de envío: ~$${result.fee}~ ¡GRATIS!\n\n` +
        `✨ Subtotal: $${subtotal.toFixed(2)} (mínimo: $${freeDeliveryMin})`;
        
    return { message, keyboard: null }; // No keyboard needed, it continues
}

function getDeliveryFeeMessage(result, freeDeliveryMin) {
    const message = `📍 *Ubicación confirmada*\n\n` +
        `📏 Distancia: ${result.distanceKm.toFixed(2)} km\n` +
        `💰 Costo de envío: $${result.fee.toFixed(2)}\n\n` +
        `💡 _Envío gratis en pedidos mayores a $${freeDeliveryMin}_`;
        
    return { message, keyboard: null }; // No keyboard needed
}

function getDeliveryErrorMessage() {
    const message = '❌ Error calculando envío. Por favor intenta nuevamente.';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🏪 Recoger en tienda', 'change_to_pickup')],
        [Markup.button.callback('❌ Cancelar pedido', 'cancel_order')]
    ]);
    return { message, keyboard };
}

function getConfirmPhoneMessage(existingPhone) {
    const message = `📞 ¿Confirmas que usemos este número?\n*${existingPhone}*`;
    const keyboard = Markup.inlineKeyboard([
        Markup.button.callback('👍 Sí, usar este', `confirm_phone_yes`),
        Markup.button.callback('✏️ No, usar otro', `confirm_phone_no`)
    ]);
    return { message, keyboard };
}

function getAskForPhoneMessage() {
    const message = '📞 Por favor, comparte tu número de teléfono para confirmación.\n\nPuedes escribirlo o usar el botón de abajo.';
    const keyboard = Markup.keyboard([
        [Markup.button.contactRequest('Compartir mi número 📱')]
    ]).oneTime().resize();
    
    return { message, keyboard };
}

function getAskPaymentMethodMessage(enabledMethods) {
    const message = '💳 *Selecciona tu método de pago:*';
    const buttons = enabledMethods.map(pm =>
        [Markup.button.callback(`💳 ${pm.name}`, `payment_${pm.id}`)]
    );
    const keyboard = Markup.inlineKeyboard(buttons);
    return { message, keyboard };
}

function getNoPaymentMethodsMessage() {
    const message = '⚠️ No hay métodos de pago configurados. Por favor contacta al restaurante.';
    return { message, keyboard: Markup.inlineKeyboard([]) };
}

module.exports = {
    getOutOfDeliveryRangeMessage,
    getFreeDeliveryMessage,
    getDeliveryFeeMessage,
    getDeliveryErrorMessage,
    getConfirmPhoneMessage,
    getAskForPhoneMessage,
    getAskPaymentMethodMessage,
    getNoPaymentMethodsMessage
};