// backend/src/bot/handlers/menuHandler.js
const menuService = require('../../services/menuService');
const telegramUserService = require('../services/telegramUserService');
const menuKeyboards = require('../keyboards/menuKeyboards');

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
            ctx.session.lastMessageId = ctx.callbackQuery?.message?.message_id;
        }

        const menuItems = await menuService.getMenuForBot(restaurantId);
        if (!menuItems || menuItems.length === 0) {
            const { message, keyboard } = menuKeyboards.getEmptyMenuMessage();
            return isEdit
                ? ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard })
                : ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
        }

        const { message, keyboard } = menuKeyboards.getMenuMessage(menuItems, page);

        const options = {
            parse_mode: 'Markdown',
            ...keyboard
        };

        if (isEdit) {
            if (ctx.callbackQuery?.message?.text === message) {
                return ctx.answerCbQuery('✅ Ya estás aquí');
            }
            try {
                await ctx.editMessageText(message, options);
                await ctx.answerCbQuery();
            } catch (editError) {
                console.log('Edit falló, enviando mensaje nuevo...');
                await ctx.reply(message, options);
                await ctx.answerCbQuery();
            }
        } else {
            const msg = await ctx.reply(message, options);
            if (ctx.session) {
                ctx.session.lastMessageId = msg.message_id;
            }
        }

    } catch (error) {
        console.error('Error en showMenuView:', error);
        const { message, keyboard } = menuKeyboards.getMenuErrorMessage(isEdit, page);
        try {
            if (isEdit) {
                await ctx.answerCbQuery('❌ Error', { show_alert: true });
                await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
            } else {
                await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
            }
        } catch (e) {
            console.error('Error enviando mensaje de error:', e);
        }
    }
}

async function showItemInfo(ctx, itemId, restaurantId) {
    try {
        await ctx.answerCbQuery('📋 Cargando info...');

        const menuItems = await menuService.getMenuForBot(restaurantId);
        const item = menuItems.find(i => i.id === itemId);

        if (!item) {
            await ctx.answerCbQuery('😔 Platillo no encontrado', { show_alert: true });
            return;
        }

        const { message, keyboard } = menuKeyboards.getItemInfoMessage(item);

        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
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
    showItemInfo
};