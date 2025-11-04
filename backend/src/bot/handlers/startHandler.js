// backend/src/bot/handlers/startHandler.js
const configBotService = require('../services/configBotService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService');
const startKeyboards = require('../keyboards/startKeyboards');

module.exports = async (ctx) => {
    console.log(`[StartHandler] Recibido comando /start del usuario: ${ctx.from.id} a las ${new Date().toLocaleTimeString()}`);
    await ctx.replyWithChatAction('typing');

    try {
        const firstName = ctx.from.first_name;
        let restaurantId = null;

        const startPayload = ctx.startPayload || ctx.payload;

        if (startPayload) {
            console.log(`[StartHandler] Deep link detectado con payload: ${startPayload}`);
            restaurantId = startPayload;
            if (!ctx.session) { ctx.session = {}; }
            ctx.session.restaurantId = restaurantId;
            await telegramUserService.linkChatToRestaurant(ctx.chat.id, restaurantId);
        } else {
            restaurantId = ctx.session?.restaurantId;
            if (restaurantId) {
                console.log(`[StartHandler] Usuario existente. ID ${restaurantId} encontrado en la SESIÓN.`);
            } else {
                console.log(`[StartHandler] No hay payload ni ID en sesión. Consultando DB...`);
                restaurantId = await telegramUserService.getRestaurantIdByChatId(ctx.chat.id);
                if (restaurantId) {
                    console.log(`[StartHandler] Usuario existente. ID ${restaurantId} encontrado en la DB.`);
                    if (!ctx.session) { ctx.session = {}; }
                    ctx.session.restaurantId = restaurantId;
                } else {
                    console.log(`[StartHandler] Usuario no encontrado en DB.`);
                }
            }
        }

        if (!restaurantId) {
            console.log(`[StartHandler] /start manual sin payload Y sin registro. Acceso denegado.`);
            const { message, keyboard } = startKeyboards.getAccessDeniedMessage();
            await ctx.reply(message, { ...keyboard });
            return;
        }

        console.log(`[StartHandler] Procediendo con restaurantId: ${restaurantId}`);
        ctx.state.restaurantId = restaurantId;

        await telegramUserService.saveUserInfo(ctx.from, restaurantId);
        await telegramUserService.updateUserCommands(ctx, restaurantId);

        const restaurantData = await configBotService.getRestaurantData(restaurantId);
        const messages = restaurantData.messages || {};
        const features = restaurantData.features || {};
        const restaurantName = restaurantData.info?.name || 'Nuestro Restaurante';

        if (features.botEnabled === false) {
            const { message, keyboard } = startKeyboards.getBotDisabledMessage(messages);
            await ctx.reply(message, { ...keyboard });
            return;
        }

        const availability = await availabilityService.checkAvailability(restaurantId);

        if (availability.status !== 'open') {
            const hours = restaurantData.hours || {};
            const { message, keyboard } = startKeyboards.getClosedRestaurantMessage(firstName, restaurantName, availability, hours);
            await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
            return;
        }

        const { message, keyboard } = startKeyboards.getOpenRestaurantMessage(firstName, restaurantName, messages);
        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error(`[StartHandler] 💥 Error procesando /start para ${ctx.from.id}:`, error);
        const { message, keyboard } = startKeyboards.getErrorMessage(error);
        await ctx.reply(message, { ...keyboard });
    }
};