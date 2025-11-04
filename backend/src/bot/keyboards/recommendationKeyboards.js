// backend/src/bot/keyboards/recommendationKeyboards.js
const { Markup } = require('telegraf');
const PAGE_SIZE = 5; // Asegúrate que este valor sea el mismo que en el handler

function getRecommendationPageLayout(items, page) {
    const totalPages = Math.ceil(items.length / PAGE_SIZE);
    const paginatedItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    let messageText = `¡Aquí tienes algunas recomendaciones para ti! (Página ${page + 1}/${totalPages}) 👇\n`;
    const keyboardButtons = [];

    paginatedItems.forEach(item => {
        messageText += `\n${'─'.repeat(15)}\n`;
        messageText += `*${item.nombre}* - $${item.precio.toFixed(2)}\n`;
        messageText += `_${item.descripcion || ''}_\n`;

        if (item.tipo_item === 'producto') {
            keyboardButtons.push([Markup.button.callback(`➕ Añadir ${item.nombre}`, `add_item_${item.id}`)]);
        } else { // Asumimos que es 'combo'
            keyboardButtons.push([Markup.button.callback(`🚀 Armar ${item.nombre}`, `build_combo:${item.id}`)]);
        }
    });

    messageText += `\n${'─'.repeat(15)}\n`;

    const navigationButtons = [];
    if (page > 0) {
        navigationButtons.push(Markup.button.callback('⬅️ Anterior', `rec_page:${page - 1}`));
    }
    if ((page + 1) * PAGE_SIZE < items.length) {
        navigationButtons.push(Markup.button.callback('Siguiente ➡️', `rec_page:${page + 1}`));
    }

    if (navigationButtons.length > 0) {
        keyboardButtons.push(navigationButtons);
    }

    keyboardButtons.push([
        Markup.button.callback('🛒 Ver mi carrito', 'view_cart'),
        Markup.button.callback('📋 Volver al Menú', 'back_to_menu')
    ]);
    keyboardButtons.push([Markup.button.callback('💡 Empezar de nuevo', 'start_recommendation')]);

    return { message: messageText, keyboard: Markup.inlineKeyboard(keyboardButtons) };
}

function getQuestionMessage(data) {
    const buttons = data.opciones.map(opt => 
        Markup.button.callback(opt.texto_boton, `rec_add:${opt.filtro_a_agregar}`)
    );

    // Convertir a array de arrays para el layout
    const buttonGrid = buttons.map(btn => [btn]);

    // Añadir botón de volver
    buttonGrid.push([Markup.button.callback('⬅️ Volver', 'rec_back')]);

    return { message: data.texto, keyboard: Markup.inlineKeyboard(buttonGrid) };
}

function getNoMoreOptionsMessage(text) {
    const message = text + '\n\nNo hay más opciones. ¿Buscamos con los filtros actuales?';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('Sí, buscar ahora', 'rec_add:final:true')],
        [Markup.button.callback('⬅️ Volver', 'rec_back')]
    ]);
    return { message, keyboard };
}

function getNoResultsMessage() {
    const message = '🤔 No encontré productos que coincidan...';
    const keyboard = Markup.inlineKeyboard([ [Markup.button.callback('💡 Sí, empezar de nuevo', 'start_recommendation')], [Markup.button.callback('⬅️ Volver', 'rec_back')] ]);
    return { message, keyboard };
}

function getErrorMessage() {
    const message = 'Lo siento, ocurrió un error mientras buscaba recomendaciones. Por favor, intenta de nuevo.';
    return { message, keyboard: null };
}

module.exports = {
    PAGE_SIZE,
    getRecommendationPageLayout,
    getQuestionMessage,
    getNoMoreOptionsMessage,
    getNoResultsMessage,
    getErrorMessage
};