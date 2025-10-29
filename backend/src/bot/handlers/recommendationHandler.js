// backend/src/bot/handlers/recommendationHandler.js
// ❌ const apiClient = require('../../services/apiClient');
const RecommendationService = require('../../services/recommendationService'); // ✅ IMPORTAR SERVICIO
const telegramUserService = require('../services/telegramUserService');
const { Markup } = require('telegraf');

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

        if (command === 'start_recommendation') {
            ctx.session.recommendationFilters = [];
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

        // ❌ Llamada a apiClient eliminada
        // const response = await apiClient.post('/chatbot/get-recommendation', {
        //     filtros_actuales: ctx.session.recommendationFilters
        // });
        // const data = response.data;

        // ✅ Llamada directa al servicio
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
            await ctx.editMessageText('¡Aquí tienes algunas recomendaciones para ti! 👇');
            
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    const caption = `*${item.nombre}*\n${item.descripcion || ''}\n\n*Precio: $${item.precio.toFixed(2)}*`; // Añadido $
                    const keyboard = Markup.inlineKeyboard([
                        item.tipo_item === 'producto'
                            // ❗ CORRECCIÓN: 'add_to_cart' no existe, debe ser 'add_item_'
                            ? Markup.button.callback('🛒 Añadir al Carrito', `add_item_${item.id}`)
                            : Markup.button.callback('🚀 Armar Combo', `build_combo:${item.id}`)
                    ]);

                    if (item.foto_url) {
                        try {
                            await ctx.replyWithPhoto(item.foto_url, {
                                caption: caption,
                                parse_mode: 'Markdown',
                                ...keyboard
                            });
                        } catch (e) {
                            console.error(`Fallo al enviar foto ${item.foto_url}, enviando como texto.`, e.message);
                            await ctx.reply(caption, { parse_mode: 'Markdown', ...keyboard });
                        }
                    } else {
                        await ctx.reply(caption, { parse_mode: 'Markdown', ...keyboard });
                    }
                }
            } else {
                await ctx.reply('🤔 No encontré productos que coincidan con todos tus filtros. ¿Quieres intentar de nuevo?',
                    Markup.inlineKeyboard([
                        Markup.button.callback('💡 Sí, empezar de nuevo', 'start_recommendation')
                    ])
                );
            }
            delete ctx.session.recommendationFilters;
        }

    } catch (error) {
        console.error('Error en recommendationHandler:', error.response ? error.response.data : error.message);
        await ctx.reply('Lo siento, ocurrió un error mientras buscaba recomendaciones. Por favor, intenta de nuevo.');
        if (ctx.session) {
            delete ctx.session.recommendationFilters;
        }
    }
}

module.exports = {
    handleRecommendation
};