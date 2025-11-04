// backend/src/bot/keyboards/startKeyboards.js
const { Markup } = require('telegraf');
const availabilityService = require('../../services/availabilityService');

function getAccessDeniedMessage() {
    const message = `👋 ¡Hola!\n\nPara usar este bot y hacer pedidos, necesitas escanear el código QR que se encuentra en el restaurante.\n\nEsto nos ayuda a saber exactamente desde dónde nos contactas. ¡Gracias!`;
    return {
        message,
        keyboard: Markup.removeKeyboard()
    };
}

function getBotDisabledMessage(messages) {
    const message = messages.botDisabled || 'El bot está temporalmente desactivado. Disculpa las molestias.';
    return {
        message,
        keyboard: Markup.removeKeyboard()
    };
}

function getClosedRestaurantMessage(firstName, restaurantName, availability, hours) {
    let message = `👋 ¡Hola ${firstName}!\n\n`;
    message += `Bienvenido a *${restaurantName}* 🍽️\n\n`;
    message += `😔 Actualmente estamos *cerrados*\n\n`;

    if (availability.reason) {
        message += `📋 ${availability.reason}\n\n`;
    }

    const now = new Date();
    const dayKey = availabilityService.getDayKey(now.getDay());
    const todayHours = hours[dayKey];

    if (todayHours && !todayHours.closed) {
        message += `⏰ *Horario de hoy:*\n`;
        message += `   Abrimos: ${todayHours.open}\n`;
        message += `   Cerramos: ${todayHours.close}`;
    }

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📋 Ver Menú', 'show_menu')],
        [Markup.button.callback('ℹ️ Información', 'show_info')]
    ]);

    return { message, keyboard };
}

function getOpenRestaurantMessage(firstName, restaurantName, messages) {
    const welcomeMessage = (messages.welcome || '¡Hola {nombre}! Bienvenido a {restaurante} 🍽️')
        .replace('{nombre}', firstName)
        .replace('{restaurante}', restaurantName);

    const message = `${welcomeMessage}\n\n` +
        `✨ Estamos *abiertos* y listos para atenderte.\n\n` +
        `👇 *¿Qué te gustaría hacer?*`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📋 Ver Menú Completo', 'show_menu')],
        [Markup.button.callback('💡 ¡Ayúdame a descubrir!', 'start_recommendation')],
        [Markup.button.callback('📞 Info del Restaurante', 'show_info')]
    ]);

    return { message, keyboard };
}

function getErrorMessage(error) {
    console.error(`[startKeyboards] Generating error message for error:`, error);
    const message = '❌ Hubo un error al procesar tu solicitud.\n\n' +
                  'Por favor intenta nuevamente con /start';
    return {
        message,
        keyboard: Markup.removeKeyboard()
    };
}

module.exports = {
    getAccessDeniedMessage,
    getBotDisabledMessage,
    getClosedRestaurantMessage,
    getOpenRestaurantMessage,
    getErrorMessage
};
