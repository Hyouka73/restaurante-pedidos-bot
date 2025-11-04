// backend/src/bot/keyboards/menuKeyboards.js
const { Markup } = require('telegraf');

const ITEMS_PER_PAGE = 5;

function getEmptyMenuMessage() {
    const message = '😔 *Menú no disponible*\n\n¿Deseas intentar más tarde?';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Reintentar', 'show_menu')],
        [Markup.button.callback('🏠 Volver', 'back_to_start')]
    ]);
    return { message, keyboard };
}

function getMenuMessage(menuItems, page) {
    const totalPages = Math.ceil(menuItems.length / ITEMS_PER_PAGE);
    page = Math.max(1, Math.min(page, totalPages));

    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = menuItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    let messageText = `🍽️ *MENÚ*\n\n`;
    const allButtons = [];

    pageItems.forEach((item, index) => {
        const itemType = item.isCombo ? '🎁' : '🍽️';
        const price = item.price || 0;

        messageText += `${itemType} *${item.name}*\n`;
        messageText += `💰 *$${price.toFixed(2)}*\n\n`;

        if (item.isCombo) {
            allButtons.push([
                Markup.button.callback('ℹ️ Info', `item_info_${item.id}`),
                Markup.button.callback('🚀 Armar Combo', `build_combo:${item.id}`)
            ]);
        } else {
            allButtons.push([
                Markup.button.callback('ℹ️ Info', `item_info_${item.id}`),
                Markup.button.callback('➕ Añadir', `add_item_${item.id}`)
            ]);
        }
    });

    messageText += `📄 Pág. ${page}/${totalPages}`;

    const navButtons = [];
    if (totalPages > 1) {
        const pageNavRow = [];
        if (page > 1) {
            pageNavRow.push(Markup.button.callback('⬅️', `menu_page_${page - 1}`));
        }
        pageNavRow.push(Markup.button.callback(`${page}/${totalPages}`, 'no_action'));
        if (page < totalPages) {
            pageNavRow.push(Markup.button.callback('➡️', `menu_page_${page + 1}`));
        }
        navButtons.push(pageNavRow);
    }

    navButtons.push([
        Markup.button.callback('🛒 Ver Carrito', 'view_cart'),
        Markup.button.callback('🏠 Inicio', 'back_to_start')
    ]);

    const keyboard = Markup.inlineKeyboard([
        ...allButtons,
        ...navButtons
    ]);

    return { message: messageText, keyboard };
}

function getItemInfoMessage(item) {
    let infoText = `${item.isCombo ? '🎁' : '🍽️'} *${item.name}*\n\n`;

    if (item.description) {
        infoText += `${item.description}\n\n`;
    }

    infoText += `💰 *Precio:* $${item.price}\n`;

    if (item.prepTime) {
        infoText += `⏱️ *Tiempo:* ${item.prepTime} min\n`;
    }

    if (item.ingredients) {
        infoText += `\n🥘 *Ingredientes:*\n${item.ingredients}`;
    }

    const buttons = [
        [Markup.button.callback('🛒 Añadir al Carrito', `add_item_${item.id}`)],
        [Markup.button.callback('« Volver al Menú', 'back_to_menu')]
    ];

    const keyboard = Markup.inlineKeyboard(buttons);

    return { message: infoText, keyboard };
}

function getMenuErrorMessage(isEdit, page) {
    const message = '❌ *Error al cargar menú*\n\n¿Reintentar?';
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Sí', isEdit ? `menu_page_${page}` : 'show_menu')],
        [Markup.button.callback('🏠 Volver', 'back_to_start')]
    ]);
    return { message, keyboard };
}

module.exports = {
    getEmptyMenuMessage,
    getMenuMessage,
    getItemInfoMessage,
    getMenuErrorMessage
};
