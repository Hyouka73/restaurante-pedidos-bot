// backend/src/bot/handlers/cartHandler.js
const { Markup } = require('telegraf');
const menuService = require('../../services/menuService');
const DiscountRuleService = require('../../services/discountRuleService');
const cartKeyboards = require('../keyboards/cartKeyboards');
const { showItemInfo } = require('./menuHandler');
const { SESSION_STATES } = require('./orderHandler');

async function handleAddItem(ctx, callbackData, userId, restaurantId) {
    if (!ctx.session?.cart) {
        ctx.session.cart = {
            restaurantId,
            items: [],
            step: SESSION_STATES.SELECTING_ITEM,
            customerName: ctx.from.first_name,
            createdAt: new Date().toISOString()
        };
    }
    const session = ctx.session.cart;

    const itemId = callbackData.split('_')[2];
    const menuData = await menuService.getMenuForBot(restaurantId);

    if (!Array.isArray(menuData)) {
        await ctx.answerCbQuery('❌ Error al cargar menú', { show_alert: true });
        return;
    }

    const item = menuData.find(i => i.id === itemId);
    if (!item || item.available === false) {
        await ctx.answerCbQuery('😔 Platillo no disponible', { show_alert: true });
        return;
    }

    const existingItem = session.items.find(i => i.id === itemId);
    if (existingItem) {
        existingItem.quantity += 1;
        await ctx.answerCbQuery(`✅ ${item.name} agregado (${existingItem.quantity}x)`);
    } else {
        session.items.push({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: 1,
            type: item.type || 'item'
        });
        await ctx.answerCbQuery(`✅ ${item.name} añadido`);
    }

    const { cart: updatedCart, notification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
    ctx.session.cart = updatedCart;

    if (notification && notification.title) {
        await ctx.reply(`*${notification.title}*
${notification.text}`, { parse_mode: 'Markdown' });
    }

    await handleViewCart(ctx, userId);
}

async function handleItemInfo(ctx, callbackData, restaurantId) {
    const itemId = callbackData.split('_')[2];
    await showItemInfo(ctx, itemId, restaurantId);
}

async function handleViewCart(ctx, userId) {
    const session = ctx.session?.cart;

    if (!session || session.items.length === 0) {
        await ctx.answerCbQuery();
        const { message, keyboard } = cartKeyboards.getEmptyCartMessage();
        try {
            await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
        } catch {
            await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
        }
        return;
    }

    const { message, keyboard } = cartKeyboards.getCartViewMessage(session);

    await ctx.answerCbQuery();
    try {
        await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
    } catch {
        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }
}

async function handleQuantityChange(ctx, callbackData, userId, restaurantId) {
    const session = ctx.session?.cart;
    if (!session) {
        await ctx.answerCbQuery('⚠️ Sesión expirada');
        return;
    }

    const [action, operation, indexStr] = callbackData.split('_');
    const index = parseInt(indexStr);
    const item = session.items[index];

    if (!item) {
        await ctx.answerCbQuery('❌ Item no encontrado');
        return;
    }

    if (operation === 'increase') {
        item.quantity += 1;
        await ctx.answerCbQuery(`✅ ${item.name}: ${item.quantity}x`);
    } else if (operation === 'decrease') {
        if (item.quantity > 1) {
            item.quantity -= 1;
            await ctx.answerCbQuery(`✅ ${item.name}: ${item.quantity}x`);
        } else {
            await ctx.answerCbQuery('⚠️ Usa 🗑️ para eliminar');
            return;
        }
    }

    const { cart: updatedCart, notification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
    ctx.session.cart = updatedCart;

    if (notification) {
        await ctx.reply(`*${notification.title}*
${notification.text}`, { parse_mode: 'Markdown' });
    }

    await handleViewCart(ctx, userId);
}

async function handleRemoveItem(ctx, callbackData, userId, restaurantId) {
    const session = ctx.session?.cart;
    if (!session) {
        await ctx.answerCbQuery('⚠️ Sesión expirada');
        return;
    }

    const index = parseInt(callbackData.split('_')[1]);
    const item = session.items[index];

    if (!item) {
        await ctx.answerCbQuery('❌ Item no encontrado');
        return;
    }

    const removedItemName = item.name;
    session.items.splice(index, 1);
    await ctx.answerCbQuery(`🗑️ ${removedItemName} eliminado`);

    const { cart: updatedCart, notification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
    ctx.session.cart = updatedCart;

    if (notification) {
        await ctx.reply(`*${notification.title}*
${notification.text}`, { parse_mode: 'Markdown' });
    }

    await handleViewCart(ctx, userId);
}

async function handleConfirmClearCart(ctx) {
    await ctx.answerCbQuery();
    const { message, keyboard } = cartKeyboards.getConfirmClearCartMessage();
    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
}

async function handleClearCart(ctx, userId) {
    const session = ctx.session?.cart;
    if (session) {
        session.items = [];
        const { cart: updatedCart } = await DiscountRuleService.applyDynamicCombos(session, session.restaurantId);
        ctx.session.cart = updatedCart;
        await ctx.answerCbQuery('🛒 Carrito vaciado');
        await handleViewCart(ctx, userId);
    } else {
        await ctx.answerCbQuery('⚠️ Sesión expirada', { show_alert: true });
    }
}

module.exports = {
    handleAddItem,
    handleItemInfo,
    handleViewCart,
    handleQuantityChange,
    handleRemoveItem,
    handleConfirmClearCart,
    handleClearCart
};
