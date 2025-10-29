// backend/src/bot/handlers/menuHandler.js
const menuService = require('../../services/menuService');
const telegramUserService = require('../services/telegramUserService');
const { Markup } = require('telegraf');

const ITEMS_PER_PAGE = 4; // Podemos ajustar cuántos items mostrar por página

/**
 * Muestra una vista paginada y editable del menú.
 * @param {object} ctx El contexto de Telegraf.
 * @param {number} page El número de página a mostrar (base 1).
 * @param {boolean} isEdit Si es true, edita el mensaje existente.
 */
async function showMenuView(ctx, page = 1, isEdit = false) {
  try {
    const restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
    if (!restaurantId) {
      return ctx.reply('⚠️ No se pudo identificar el restaurante. Usa /start primero.');
    }

    const menuItems = await menuService.getMenuForBot(restaurantId);
    if (!menuItems || menuItems.length === 0) {
      const emptyMenuText = '😔 Lo sentimos, el menú no está disponible en este momento.';
      // Si es una edición, edita el mensaje, si no, responde.
      return isEdit ? ctx.editMessageText(emptyMenuText) : ctx.reply(emptyMenuText);
    }

    const totalPages = Math.ceil(menuItems.length / ITEMS_PER_PAGE);
    page = Math.max(1, Math.min(page, totalPages)); // Asegurar que la página esté en el rango correcto

    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = menuItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // --- Construir el texto del mensaje ---
    let messageText = `📋 *Nuestro Menú* - Página ${page} de ${totalPages}\n\n`;
    if (pageItems.length === 0 && menuItems.length > 0) {
        messageText = '🤔 No hay más platillos por aquí. ¡Prueba la página anterior!';
    } else {
        pageItems.forEach(item => {
            const itemType = item.isCombo ? '🎁' : '🍽️';
            messageText += `${itemType} *${item.name}* - 💰 $${item.price}\n`;
            if (item.description) {
                // Limitar la descripción para no hacer el mensaje muy largo
                const shortDesc = item.description.length > 50 ? item.description.substring(0, 47) + '...' : item.description;
                messageText += `_${shortDesc}_
`;
            }
            messageText += `\n`;
        });
    }
    messageText += '👇 Agrega platillos a tu pedido o navega por el menú.';

    // --- Construir el teclado de botones ---
    const itemButtons = pageItems.map(item => {
        return [Markup.button.callback(`➕ ${item.name}`, `add_item_${item.id}`)];
    });

    const navButtons = [];
    if (page > 1) {
        navButtons.push(Markup.button.callback('⬅️ Anterior', `menu_page_${page - 1}`));
    }
    // Botón de página (no se puede hacer clic)
    navButtons.push(Markup.button.callback(`Pág. ${page}/${totalPages}`, 'no_action'));
    if (page < totalPages) {
        navButtons.push(Markup.button.callback('Siguiente ➡️', `menu_page_${page + 1}`));
    }

    const actionsRow = [
        Markup.button.callback('🛒 Ver Carrito', 'view_cart'),
        Markup.button.callback('« Volver', 'back_to_start')
    ];

    const keyboard = Markup.inlineKeyboard([
        ...itemButtons,
        navButtons,
        actionsRow
    ]);

    // --- Enviar o Editar Mensaje ---
    if (isEdit) {
        // Evitar error si el mensaje es idéntico
        if (ctx.callbackQuery.message.text === messageText) {
            return ctx.answerCbQuery('Ya estás en esta página.');
        }
        await ctx.editMessageText(messageText, { parse_mode: 'Markdown', ...keyboard });
        await ctx.answerCbQuery();
    } else {
        await ctx.reply(messageText, { parse_mode: 'Markdown', ...keyboard });
    }

  } catch (error) {
    console.error('Error en showMenuView:', error);
    const errorMessage = '❌ Hubo un error al mostrar el menú.';
    try {
        if (isEdit) {
            await ctx.answerCbQuery(errorMessage, { show_alert: true });
        } else {
            await ctx.reply(errorMessage);
        }
    } catch (e) {
        console.error('Error enviando mensaje de error de menú:', e);
    }
  }
}

// El manejador principal del comando /menu ahora solo llama a la nueva función
const menuHandler = async (ctx) => {
  await showMenuView(ctx, 1, false);
};

// Exportar tanto el manejador como la función reutilizable
module.exports = { menuHandler, showMenuView };
