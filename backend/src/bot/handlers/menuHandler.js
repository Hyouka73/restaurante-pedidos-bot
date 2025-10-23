//backend/src/bot/handlers/menuHandler.js
const menuService = require('../../services/menuService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService'); // Importar servicio

module.exports = async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const restaurantId = await telegramUserService.getRestaurantIdByChat(chatId);

    // --- VERIFICAR DISPONIBILIDAD ---
    const availability = await availabilityService.checkAvailability(restaurantId);

    if (availability.status !== 'open') {
      let messageToSend = 'Lo sentimos, no podemos mostrar el menú en este momento.';
      if (availability.reason) {
        messageToSend += ` Motivo: ${availability.reason}`;
      }
      await ctx.reply(messageToSend);
      return; // Salir del handler si no está abierto
    }
    // --- FIN VERIFICAR DISPONIBILIDAD ---

    const menuItems = await menuService.getMenu(restaurantId);

    if (menuItems.length === 0) {
      await ctx.reply('Lo sentimos, el menú aún no está disponible.');
      return;
    }

    // Opción 2: Enviar como lista con botones inline para cada item (más interactivo)
    let menuMessageText = '🛒 *Selecciona un platillo:*\n\n';
    let inlineKeyboard = [];

    menuItems.forEach((item, index) => {
      // Creamos botones por fila (2 por fila es común)
      if (index % 2 === 0) {
        inlineKeyboard.push([]);
      }
      const currentRow = inlineKeyboard[inlineKeyboard.length - 1];
      currentRow.push({
        text: item.name,
        callback_data: `show_item_details_${item.id}` // Opción para ver detalles
        // O para agregar directamente al pedido: callback_data: `add_item_${item.id}`
      });
    });

    await ctx.reply(menuMessageText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });

  } catch (error) {
    console.error('Error en menuHandler:', error);
    await ctx.reply('Hubo un error al cargar el menú.');
  }
};