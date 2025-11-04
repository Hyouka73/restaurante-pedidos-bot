// backend/src/bot/handlers/recommendationHandler.js
const RecommendationService = require('../../services/recommendationService');
const telegramUserService = require('../services/telegramUserService');
const recommendationKeyboards = require('../keyboards/recommendationKeyboards'); // Importamos

const PAGE_SIZE = recommendationKeyboards.PAGE_SIZE;

async function sendRecommendationPage(ctx, page = 0, preamble = null) {
    const items = ctx.session.recommendationResults;
    if (!items) {
        const { message } = recommendationKeyboards.getErrorMessage();
        await ctx.reply(message);
        return;
    }

    let { message, keyboard } = recommendationKeyboards.getRecommendationPageLayout(items, page);

    // 🔥 Añadir el preámbulo si existe (ej. "Veo que buscas Res...")
    if (preamble) {
        message = `_${preamble}_\n\n${message}`;
    }

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
            await sendRecommendationPage(ctx, page, null); // No hay preámbulo al paginar
            return;
        }

        // --- 🔥 LÓGICA DE FILTROS MODIFICADA ---
        if (command === 'start_recommendation') {
            ctx.session.recommendationFilters = [];
            ctx.session.recommendationResults = null;
        } else if (command === 'rec_back') {
            // Si el usuario quiere volver, eliminamos el último filtro
            if (ctx.session.recommendationFilters.length > 0) {
                ctx.session.recommendationFilters.pop();
            }
        } else if (command === 'rec_add') {
            const filterToAdd = `${parts[1]}:${parts[2]}`;
            if (!ctx.session.recommendationFilters.includes(filterToAdd)) {
                ctx.session.recommendationFilters.push(filterToAdd);
            }
        }
        // --- FIN DE LÓGICA DE FILTROS ---

        const restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
        if (!restaurantId) {
            return await ctx.reply('Lo siento, no pude identificar el restaurante.');
        }

        // El service ahora hace todo el trabajo pesado
        const data = await RecommendationService.getRecommendation(
            restaurantId,
            ctx.session.recommendationFilters
        );

        // --- 🔥 LÓGICA DE RESPUESTA MODIFICADA ---
        if (data.tipo_respuesta === 'pregunta') {
            const { message, keyboard } = recommendationKeyboards.getQuestionMessage(data);
            
            let finalMessage = message;
            if (data.preamble) { // Añadir mensaje de cascada
                finalMessage = `_${data.preamble}_\n\n${message}`;
            }
            
            await ctx.editMessageText(finalMessage, { parse_mode: 'Markdown', ...keyboard });
        
        } else if (data.tipo_respuesta === 'recomendacion_final') {
            if (data.items && data.items.length > 0) {
                ctx.session.recommendationResults = data.items;
                // Enviar la página 0 con el preámbulo (si existe)
                await sendRecommendationPage(ctx, 0, data.preamble);
            } else {
                // No hay resultados
                const { message, keyboard } = recommendationKeyboards.getNoResultsMessage();
                await ctx.editMessageText(message, { ...keyboard });
            }
            // Limpiamos filtros solo si es una recomendación final
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