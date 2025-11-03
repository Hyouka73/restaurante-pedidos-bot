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
            // --- 🔥 MEJORA ANTI-SPAM Y DE FLUJO ---
            
            let messageText = '¡Aquí tienes algunas recomendaciones para ti! 👇\n';
            const keyboardButtons = [];
            
            if (data.items && data.items.length > 0) {
                
                data.items.forEach(item => {
                  // 1. Construimos el texto
                  messageText += `\n${'─'.repeat(15)}\n`;
                  messageText += `*${item.nombre}* - $${item.precio.toFixed(2)}\n`;
                  messageText += `_${item.descripcion || ''}_\n`;
        
                  // 2. Preparamos los botones
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
        
                // 3. Añadimos botones de navegación
                messageText += `\n${'─'.repeat(15)}\n`;
                keyboardButtons.push([
                  Markup.button.callback('🛒 Ver mi carrito', 'view_cart'),
                  Markup.button.callback('📋 Volver al Menú', 'back_to_menu')
                ]);
                keyboardButtons.push([
                  Markup.button.callback('💡 Empezar de nuevo', 'start_recommendation')
                ]);
        
                // 4. Editamos el mensaje original UNA SOLA VEZ
                await ctx.editMessageText(messageText, {
                  parse_mode: 'Markdown',
                  ...Markup.inlineKeyboard(keyboardButtons)
                });

            } else {
                // --- ESTO YA ESTABA BIEN ---
                await ctx.editMessageText('🤔 No encontré productos que coincidan...', {
                  ...Markup.inlineKeyboard([
                    Markup.button.callback('💡 Sí, empezar de nuevo', 'start_recommendation')
                  ])
                });
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