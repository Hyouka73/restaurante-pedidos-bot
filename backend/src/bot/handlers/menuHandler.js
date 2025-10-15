const menuService = require('../../services/menuService');
const telegramUserService = require('../services/telegramUserService');

module.exports = async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const restaurantId = await telegramUserService.getRestaurantIdByChat(chatId);

    const menuItems = await menuService.getMenu(restaurantId);

    if (menuItems.length === 0) {
      await ctx.reply('Lo sentimos, el men√∫ a√∫n no est√° disponible.');
      return;
    }

    let menuMessage = 'Ì≥ã *Men√∫:*\n\n';
    menuItems.forEach(item => {
      menuMessage += ;
      menuMessage += ;
      if (item.description) {
        menuMessage += ;
      }
      menuMessage += '\n';
    });

    await ctx.reply(menuMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error en menuHandler:', error);
    await ctx.reply('Hubo un error al cargar el men√∫.');
  }
};
