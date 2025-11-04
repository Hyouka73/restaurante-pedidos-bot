// backend/src/bot/handlers/recommendationHandler.js
const RecommendationService = require('../../services/recommendationService');
const telegramUserService = require('../services/telegramUserService');
const recommendationKeyboards = require('../keyboards/recommendationKeyboards'); // Importamos

const PAGE_SIZE = recommendationKeyboards.PAGE_SIZE; // Usamos la constante del keyboard

async function sendRecommendationPage(ctx, page = 0) {
    const items = ctx.session.recommendationResults;
    if (!items) {
        const { message } = recommendationKeyboards.getErrorMessage();
        await ctx.reply(message);
        return;
    }

    const { message, keyboard } = recommendationKeyboards.getRecommendationPageLayout(items, page);

    // Usar editMessageText si es una navegación de página, de lo contrario reply
    if (ctx.callbackQuery) {
        // Evita el error "message is not modified"
        if (ctx.callbackQuery.message.text === message) {
            return ctx.answerCbQuery('Ya estás en esta página.');
        }
        await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
    } else {
        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }
}


async function handleRecommendation(ctx) {
    try {
        await ctx.answerCbQuery();
        const callbackData = ctx.callbackQuery.data;
        const parts = callbackData.split(':');
        const command = parts[0];

        if (!ctx.session) {
            ctx.session = {};
        }
        if (!ctx.session.recommendationFilters) {
            ctx.session.recommendationFilters = [];
        }

        if (command === 'rec_page') {
            const page = parseInt(parts[1], 10);
            await sendRecommendationPage(ctx, page);
            return;
        }

        if (command === 'start_recommendation') {
            ctx.session.recommendationFilters = [];
            ctx.session.recommendationResults = null;
        } else if (command === 'rec_add') {
            const filterToAdd = `${parts[1]}:${parts[2]}`;
            if (!ctx.session.recommendationFilters.includes(filterToAdd)) {
                ctx.session.recommendationFilters.push(filterToAdd);
            }
        }

        const restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
        if (!restaurantId) {
            return await ctx.reply('Lo siento, no pude identificar el restaurante.');
        }

        const data = await RecommendationService.getRecommendation(
            restaurantId,
            ctx.session.recommendationFilters
        );

        if (data.tipo_respuesta === 'pregunta') {
            if (data.opciones && data.opciones.length > 0) {
                const { message, keyboard } = recommendationKeyboards.getQuestionMessage(data);
                await ctx.editMessageText(message, { ...keyboard });
            } else {
                const { message, keyboard } = recommendationKeyboards.getNoMoreOptionsMessage(data.texto);
                await ctx.editMessageText(message, { ...keyboard });
            }
        } else if (data.tipo_respuesta === 'recomendacion_final') {
            if (data.items && data.items.length > 0) {
                ctx.session.recommendationResults = data.items;
                await sendRecommendationPage(ctx, 0); // Llama a la función que ahora edita el mensaje
            } else {
                const { message, keyboard } = recommendationKeyboards.getNoResultsMessage();
                await ctx.editMessageText(message, { ...keyboard });
            }
            delete ctx.session.recommendationFilters;
        }

    } catch (error) {
        console.error('Error en recommendationHandler:', error);
        const { message } = recommendationKeyboards.getErrorMessage();
        await ctx.reply(message);
        if (ctx.session) {
            delete ctx.session.recommendationFilters;
            delete ctx.session.recommendationResults;
        }
    }
}

module.exports = {
    handleRecommendation
};