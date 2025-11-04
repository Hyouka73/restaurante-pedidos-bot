// backend/src/bot/keyboards/comboBuilderKeyboards.js
const { Markup } = require('telegraf');

function getComboUnavailableMessage() {
    return { message: '⚠️ Este combo no está disponible o no tiene opciones configuradas.', keyboard: null };
}

function getNextComponentQuestionMessage(builder) {
    const step = builder.currentStep;
    const component = builder.components[step];
    const buttons = component.items_opciones.map(opt =>
        Markup.button.callback(opt.nombre, `combo_select:${step}:${opt.id}`)
    );
    const message = `*Paso ${step + 1} de ${builder.components.length}:*\n${component.titulo_pregunta}`;
    const keyboard = Markup.inlineKeyboard(buttons, { columns: 2 });
    return { message, keyboard };
}

function getInvalidSessionMessage() {
    return { message: '⚠️ Tu sesión para armar el combo ha expirado o es inválida. Por favor, iníciala de nuevo.', keyboard: null };
}

function getFinalizeComboMessage(builder) {
    let summary = `*¡Combo "${builder.name}" armado!*\n\n`;
    summary += 'Tus selecciones:\n';
    builder.selections.forEach(sel => {
        summary += `*${sel.title}:* ${sel.item.nombre}\n`;
    });
    summary += `\n*Precio del combo: $${builder.price.toFixed(2)}*\n\n`;
    summary += '¡Añadido a tu carrito! 🛒';

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛒 Ver Mi Carrito', 'view_cart')],
        [Markup.button.callback('📋 Volver al Menú', 'back_to_menu')]
    ]);

    return { message: summary, keyboard };
}

function getErrorMessage() {
    const message = '❌ Ocurrió un error al intentar armar el combo. Por favor, intenta de nuevo.';
    return { message, keyboard: null };
}

module.exports = {
    getComboUnavailableMessage,
    getNextComponentQuestionMessage,
    getInvalidSessionMessage,
    getFinalizeComboMessage,
    getErrorMessage
};
