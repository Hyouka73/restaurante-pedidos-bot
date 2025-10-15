const configBotService = require('../services/configBotService');
const telegramUserService = require('../services/telegramUserService');

module.exports = async (ctx) => {
  try {
    // Obtener el ID del chat de Telegram
    const chatId = ctx.chat.id;

    // Obtener el ID del restaurante asociado a este chat
    const restaurantId = await telegramUserService.getRestaurantIdByChat(chatId);

    // Obtener los mensajes y la información del restaurante
    const messages = await configBotService.getRestaurantMessages(restaurantId);
    const restaurantData = await configBotService.getRestaurantData(restaurantId);

    // Obtener el nombre del usuario
    const firstName = ctx.from.first_name;
    const restaurantName = restaurantData.info?.name || 'Mi Restaurante';

    // Reemplazar variables en el mensaje
    const welcomeMessage = messages.welcome
      .replace('{nombre}', firstName)
      .replace('{restaurante}', restaurantName);

    await ctx.reply(welcomeMessage);
  } catch (error) {
    console.error('Error en startHandler:', error);
    await ctx.reply('Hubo un error al procesar tu solicitud.');
  }
};
