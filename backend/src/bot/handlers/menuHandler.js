// backend/src/bot/handlers/menuHandler.js - MEJORADO CON EDICIÓN ÚNICA
const menuService = require('../../services/menuService');
const telegramUserService = require('../services/telegramUserService');
const { Markup } = require('telegraf');

const ITEMS_PER_PAGE = 5;

/**
 * 🔥 MENÚ SIMPLIFICADO - Solo botones, sin texto innecesario
 */
async function showMenuView(ctx, page = 1, isEdit = false) {
  try {
    if (isEdit) {
      await ctx.answerCbQuery('📋 Cargando...');
    } else {
      await ctx.replyWithChatAction('typing');
    }

    if (!ctx.state.restaurantId) {
      ctx.state.restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
    }
    const restaurantId = ctx.state.restaurantId;

    if (!restaurantId) {
      return ctx.reply('⚠️ No se pudo identificar el restaurante. Usa /start primero.');
    }

    if (ctx.session) {
      ctx.session.lastContext = 'menu';
      ctx.session.lastMessageId = ctx.callbackQuery?.message?.message_id; // 🔥 Guardar ID del mensaje
    }

    const menuItems = await menuService.getMenuForBot(restaurantId);
    if (!menuItems || menuItems.length === 0) {
      const emptyMenuText = '😔 *Menú no disponible*\n\n¿Deseas intentar más tarde?';
      const emptyButtons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Reintentar', 'show_menu')],
        [Markup.button.callback('🏠 Volver', 'back_to_start')]
      ]);
      
      return isEdit 
        ? ctx.editMessageText(emptyMenuText, { parse_mode: 'Markdown', ...emptyButtons })
        : ctx.reply(emptyMenuText, { parse_mode: 'Markdown', ...emptyButtons });
    }

    const totalPages = Math.ceil(menuItems.length / ITEMS_PER_PAGE);
    page = Math.max(1, Math.min(page, totalPages));

    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const pageItems = menuItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // 🔥 DISEÑO MINIMALISTA - Solo lo esencial
    let messageText = `🍽️ *MENÚ*\n\n`;

    const allButtons = [];

    pageItems.forEach((item, index) => {
      const itemType = item.isCombo ? '🎁' : '🍽️';
      const price = item.price || 0;
      const number = startIndex + index + 1;

      // Solo nombre y precio, nada más
      messageText += `${itemType} *${item.name}*\n`;
      messageText += `💰 $${price.toFixed(2)}\n\n`;

      // Botones compactos en una fila
      if (item.isCombo) {
        allButtons.push([
          Markup.button.callback(`ℹ️ Info`, `item_info_${item.id}`),
          Markup.button.callback('🚀 Armar Combo', `build_combo:${item.id}`)
        ]);
      } else {
        allButtons.push([
          Markup.button.callback(`ℹ️ Info`, `item_info_${item.id}`),
          Markup.button.callback('➕ Añadir', `add_item_${item.id}`)
        ]);
      }
    });

    messageText += `📄 Pág. ${page}/${totalPages}`;

    // Navegación
    const navButtons = [];
    
    if (totalPages > 1) {
      const pageNavRow = [];
      if (page > 1) {
        pageNavRow.push(Markup.button.callback('⬅️', `menu_page_${page - 1}`));
      }
      pageNavRow.push(Markup.button.callback(`${page}/${totalPages}`, 'no_action'));
      if (page < totalPages) {
        pageNavRow.push(Markup.button.callback('➡️', `menu_page_${page + 1}`));
      }
      navButtons.push(pageNavRow);
    }

    navButtons.push([
      Markup.button.callback('🛒 Ver Carrito', 'view_cart'),
      Markup.button.callback('🏠 Inicio', 'back_to_start')
    ]);

    const keyboard = Markup.inlineKeyboard([
      ...allButtons,
      ...navButtons
    ]);

    const options = {
      parse_mode: 'Markdown',
      ...keyboard
    };
    
    if (isEdit) {
      if (ctx.callbackQuery?.message?.text === messageText) {
        return ctx.answerCbQuery('✅ Ya estás aquí');
      }
      
      try {
        await ctx.editMessageText(messageText, options);
        await ctx.answerCbQuery();
      } catch (editError) {
        console.log('Edit falló, enviando mensaje nuevo...');
        await ctx.reply(messageText, options);
        await ctx.answerCbQuery();
      }
    } else {
      const msg = await ctx.reply(messageText, options);
      if (ctx.session) {
        ctx.session.lastMessageId = msg.message_id; // 🔥 Guardar para futuras ediciones
      }
    }

  } catch (error) {
    console.error('Error en showMenuView:', error);
    const errorMessage = '❌ *Error al cargar menú*\n\n¿Reintentar?';
    
    try {
      const errorButtons = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Sí', isEdit ? `menu_page_${page}` : 'show_menu')],
        [Markup.button.callback('🏠 Volver', 'back_to_start')]
      ]);
      
      if (isEdit) {
        await ctx.answerCbQuery('❌ Error', { show_alert: true });
        await ctx.editMessageText(errorMessage, { parse_mode: 'Markdown', ...errorButtons });
      } else {
        await ctx.reply(errorMessage, { parse_mode: 'Markdown', ...errorButtons });
      }
    } catch (e) {
      console.error('Error enviando mensaje de error:', e);
    }
  }
}

/**
 * 🔥 NUEVA FUNCIÓN: Mostrar info de item (editando el mismo mensaje)
 */
async function showItemInfo(ctx, itemId, restaurantId) {
  try {
    await ctx.answerCbQuery('📋 Cargando info...');
    
    const menuItems = await menuService.getMenuForBot(restaurantId);
    const item = menuItems.find(i => i.id === itemId);

    if (!item) {
      await ctx.answerCbQuery('😔 Platillo no encontrado', { show_alert: true });
      return;
    }

    // 🔥 DISEÑO LIMPIO DE INFO
    let infoText = `${item.isCombo ? '🎁' : '🍽️'} *${item.name}*\n\n`;
    
    if (item.description) {
      infoText += `${item.description}\n\n`;
    }
    
    infoText += `💰 *Precio:* $${item.price}\n`;
    
    if (item.prepTime) {
      infoText += `⏱️ *Tiempo:* ${item.prepTime} min\n`;
    }
    
    if (item.ingredients) {
      infoText += `\n🥘 *Ingredientes:*\n${item.ingredients}`;
    }

    const buttons = [
      [Markup.button.callback('🛒 Añadir al Carrito', `add_item_${item.id}`)],
      [Markup.button.callback('« Volver al Menú', 'back_to_menu')]
    ];

    // 🔥 EDITAR el mismo mensaje, no crear uno nuevo
    await ctx.editMessageText(infoText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });

  } catch (error) {
    console.error('Error en showItemInfo:', error);
    await ctx.answerCbQuery('❌ Error al cargar info', { show_alert: true });
  }
}

const menuHandler = async (ctx) => {
  await ctx.replyWithChatAction('typing');
  await showMenuView(ctx, 1, false);
};

module.exports = { 
  menuHandler, 
  showMenuView,
  showItemInfo // 🔥 Exportar la nueva función
};