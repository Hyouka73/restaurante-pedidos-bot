// backend/src/bot/handlers/menuHandler.js - CORREGIDO
const menuService = require('../../services/menuService');
const telegramUserService = require('../services/telegramUserService');
const configBotService = require('../services/configBotService');
const { Markup } = require('telegraf');

module.exports = async (ctx) => {
  try {
    // 🔑 CORRECCIÓN: Usar getRestaurantIdByBotContext
    const restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);

    if (!restaurantId) {
      await ctx.reply('⚠️ No se pudo identificar el restaurante. Usa /start primero.');
      return;
    }

    // Obtener configuración del restaurante
    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const features = restaurantData.features || {};
    const messages = restaurantData.messages || {};

    // Obtener menú para bot (devuelve array plano de items y combos disponibles)
    const menuItems = await menuService.getMenuForBot(restaurantId);
    
    console.log('[menuHandler] Total menuItems:', menuItems.length);
    
    if (!menuItems || menuItems.length === 0) {
      await ctx.reply(
        '😔 Lo sentimos, el menú aún no está disponible.\n\n' +
        'Por favor intenta más tarde o contacta al restaurante.'
      );
      return;
    }

    // Mensaje introductorio personalizado
    const menuIntro = messages.menu_intro || 'Este es nuestro menú:';
    await ctx.reply(
      `📋 *${menuIntro}*\n\n` +
      `Tenemos ${menuItems.length} platillos disponibles:`,
      { parse_mode: 'Markdown' }
    );

    // Agrupar items por categoría si existen
    const itemsByCategory = {};
    menuItems.forEach(item => {
      const category = item.category || 'Sin categoría';
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(item);
    });

    // Enviar items por categoría
    for (const [category, items] of Object.entries(itemsByCategory)) {
      if (category !== 'Sin categoría') {
        await ctx.reply(`\n🏷️ *${category}*`, { parse_mode: 'Markdown' });
      }

      for (const item of items) {
        const description = item.description || 'Delicioso platillo';
        const price = `💰 ${item.price}`;
        const available = item.available !== false ? '✅ Disponible' : '❌ No disponible';
        
        const caption = 
          `*${item.name}*\n\n` +
          `${description}\n\n` +
          `${price}\n` +
          `${available}`;

        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('🛒 Ordenar', `add_item_${item.id}`)],
          [Markup.button.callback('ℹ️ Más información', `item_info_${item.id}`)]
        ]);

        try {
          // Intentar enviar con foto si está habilitado
          if (features.showMenuImages && item.imageUrl) {
            await ctx.replyWithPhoto(item.imageUrl, {
              caption,
              parse_mode: 'Markdown',
              ...keyboard
            });
          } else {
            await ctx.reply(caption, {
              parse_mode: 'Markdown',
              ...keyboard
            });
          }
        } catch (error) {
          console.error(`Error enviando item ${item.id}:`, error);
          // Fallback sin foto
          await ctx.reply(caption, {
            parse_mode: 'Markdown',
            ...keyboard
          });
        }

        // Pequeña pausa entre mensajes para no saturar
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Botones finales
    await ctx.reply(
      '👆 Puedes seleccionar cualquier platillo para ver más detalles o hacer un pedido',
      Markup.inlineKeyboard([
        [Markup.button.callback('🛒 Hacer Pedido Completo', 'init_order')],
        [Markup.button.callback('« Volver al Inicio', 'back_to_start')]
      ])
    );

  } catch (error) {
    console.error('Error en menuHandler:', error);
    await ctx.reply(
      '❌ Hubo un error al cargar el menú.\n\n' +
      'Por favor intenta nuevamente con /menu o contacta al restaurante.'
    );
  }
};