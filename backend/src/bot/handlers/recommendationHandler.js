// backend/src/bot/handlers/recommendationHandler.js
const RecommendationService = require('../../services/recommendationService');
const telegramUserService = require('../services/telegramUserService');
const { Markup } = require('telegraf');

const PAGE_SIZE = 5; // Número de recomendaciones por página

async function sendRecommendationPage(ctx, page = 0) {
    const items = ctx.session.recommendationResults;
    if (!items) {
        await ctx.reply('Lo siento, no encuentro las recomendaciones. Por favor, empieza de nuevo.');
        return;
    }

    const paginatedItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    let messageText = `¡Aquí tienes algunas recomendaciones para ti! (Página ${page + 1}/${Math.ceil(items.length / PAGE_SIZE)}) 👇\n`;
    const keyboardButtons = [];

    paginatedItems.forEach(item => {
        messageText += `\n${'─'.repeat(15)}\n`;
        messageText += `*${item.nombre}* - $${item.precio.toFixed(2)}\n`;
        messageText += `_${item.descripcion || ''}_\n`;

        if (item.tipo_item === 'producto') {
            keyboardButtons.push([
                Markup.button.callback(`➕ Añadir ${item.nombre}`, `add_item_${item.id}`)
            ]);
        } else {
            keyboardButtons.push([
                Markup.button.callback(`🚀 Armar ${item.nombre}`, `build_combo:${item.id}`)
            ]);
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
    keyboardButtons.push([
        Markup.button.callback('💡 Empezar de nuevo', 'start_recommendation')
    ]);

    // Usar editMessageText si es una navegación de página, de lo contrario reply
    if (ctx.callbackQuery) {
        await ctx.editMessageText(messageText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(keyboardButtons)
        });
    } else {
        await ctx.reply(messageText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(keyboardButtons)
        });
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
                const buttons = data.opciones.map(opt =>
                    Markup.button.callback(opt.texto_boton, `rec_add:${opt.filtro_a_agregar}`)
                );
                await ctx.editMessageText(data.texto, Markup.inlineKeyboard(buttons, { columns: 2 }));
            } else {
                await ctx.editMessageText(data.texto + '\n\nNo hay más opciones. ¿Buscamos con los filtros actuales?',
                    Markup.inlineKeyboard([
                        Markup.button.callback('Sí, buscar ahora', 'rec_add:final:true')
                    ])
                );
            }

        } else if (data.tipo_respuesta === 'recomendacion_final') {
            if (data.items && data.items.length > 0) {
                ctx.session.recommendationResults = data.items;
                await sendRecommendationPage(ctx, 0);
            } else {
                await ctx.editMessageText('🤔 No encontré productos que coincidan...', {
                    ...Markup.inlineKeyboard([
                        Markup.button.callback('💡 Sí, empezar de nuevo', 'start_recommendation')
                    ])
                });
            }
            delete ctx.session.recommendationFilters;
        }

    } catch (error) {
        console.error('Error en recommendationHandler:', error);
        await ctx.reply('Lo siento, ocurrió un error mientras buscaba recomendaciones. Por favor, intenta de nuevo.');
        if (ctx.session) {
            delete ctx.session.recommendationFilters;
            delete ctx.session.recommendationResults;
        }
    }
}

module.exports = {
    handleRecommendation
};
