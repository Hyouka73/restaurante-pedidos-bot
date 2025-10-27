// backend/src/bot/handlers/recommendationHandler.js
const apiClient = require('../../services/apiClient');
const telegramUserService = require('../services/telegramUserService');
const { Markup } = require('telegraf');

async function handleRecommendation(ctx) {
    try {
        // Responder al callback para que el cliente de Telegram no muestre un "loading" infinito
        await ctx.answerCbQuery();

        const callbackData = ctx.callbackQuery.data;
        const parts = callbackData.split(':');
        const command = parts[0]; // ej: 'start_recommendation', 'rec_add' 
        
        // Inicializar la sesión y los filtros si no existen
        if (!ctx.session) {
            ctx.session = {};
        }
        if (!ctx.session.recommendationFilters) {
            ctx.session.recommendationFilters = [];
        }

        // Lógica para manejar los filtros
        if (command === 'start_recommendation') {
            ctx.session.recommendationFilters = []; // Reiniciar filtros
        } else if (command === 'rec_add') {
            const filterToAdd = `${parts[1]}:${parts[2]}`;
            // Evitar filtros duplicados
            if (!ctx.session.recommendationFilters.includes(filterToAdd)) {
                ctx.session.recommendationFilters.push(filterToAdd);
            }
        }

        // Obtener el ID del restaurante
        const restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
        if (!restaurantId) {
            return await ctx.reply('Lo siento, no pude identificar el restaurante para el que buscas recomendaciones.');
        }

        // Llamar a la API del backend
        const response = await apiClient.post('/chatbot/get-recommendation', {
            filtros_actuales: ctx.session.recommendationFilters
        });

        const data = response.data;

        // Procesar la respuesta de la API
        if (data.tipo_respuesta === 'pregunta') {
            if (data.opciones && data.opciones.length > 0) {
                const buttons = data.opciones.map(opt => 
                    Markup.button.callback(opt.texto_boton, `rec_add:${opt.filtro_a_agregar}`)
                );
                // Editar el mensaje actual con la nueva pregunta y botones
                await ctx.editMessageText(data.texto, Markup.inlineKeyboard(buttons, { columns: 2 }));
            } else {
                // Si no hay opciones, podría ser el final o un estado inesperado.
                await ctx.editMessageText(data.texto + '\n\nNo hay más opciones para filtrar. ¿Buscamos recomendaciones con los filtros actuales?', 
                    Markup.inlineKeyboard([
                        Markup.button.callback('Sí, buscar ahora', 'rec_add:final:true') // Usar un filtro especial para forzar la recomendación
                    ])
                );
            }

        } else if (data.tipo_respuesta === 'recomendacion_final') {
            await ctx.editMessageText('¡Aquí tienes algunas recomendaciones para ti! 👇');
            
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    const caption = `*${item.nombre}*\n${item.descripcion || ''}\n\n*Precio: ${item.precio.toFixed(2)}*`;
                    const keyboard = Markup.inlineKeyboard([
                        item.tipo_item === 'producto'
                            ? Markup.button.callback('🛒 Añadir al Carrito', `add_to_cart:${item.id}`)
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
            // Limpiar la sesión después de terminar
            delete ctx.session.recommendationFilters;
        }

    } catch (error) {
        console.error('Error en recommendationHandler:', error.response ? error.response.data : error.message);
        await ctx.reply('Lo siento, ocurrió un error mientras buscaba recomendaciones. Por favor, intenta de nuevo.');
        // Limpiar la sesión en caso de error
        if (ctx.session) {
            delete ctx.session.recommendationFilters;
        }
    }
}

module.exports = {
    handleRecommendation
};