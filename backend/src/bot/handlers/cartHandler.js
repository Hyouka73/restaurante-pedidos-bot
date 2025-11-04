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
        if (ctx.callbackQuery) await ctx.answerCbQuery();
        const { message, keyboard } = cartKeyboards.getEmptyCartMessage();
        try {
            await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
        } catch {
            await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
        }
        if (session) delete session.lastCartMessageId; // Limpiar si el carrito se vacía
        return;
    }

    const { message, keyboard } = cartKeyboards.getCartViewMessage(session);
    const options = { parse_mode: 'Markdown', ...keyboard };

    if (ctx.callbackQuery) await ctx.answerCbQuery();

    // 🔥 LÓGICA MEJORADA: Intentar editar el mensaje anterior del carrito si existe
    if (session.lastCartMessageId) {
        try {
            await ctx.telegram.editMessageText(ctx.chat.id, session.lastCartMessageId, null, message, options);
            return; // Si tiene éxito, no hacemos nada más
        } catch (e) {
            console.warn(`No se pudo editar el mensaje del carrito anterior (${session.lastCartMessageId}). Se enviará uno nuevo.`);
        }
    }

    // Fallback: si no hay mensaje anterior o falló la edición, edita el actual o envía uno nuevo
    try {
        const msg = await ctx.editMessageText(message, options);
        session.lastCartMessageId = msg.message_id;
    } catch (e) {
        const msg = await ctx.reply(message, options);
        session.lastCartMessageId = msg.message_id;
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

/**
 * 🔥 NUEVA FUNCIÓN
 * Añade un grupo de items (de sugerencias) al carrito.
 */
async function handleAddSuggestionGroup(ctx, itemIds, userId, restaurantId) {
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
    const menuData = await menuService.getMenuForBot(restaurantId);
    if (!Array.isArray(menuData)) {
        console.error('Error al cargar menú en handleAddSuggestionGroup');
        return;
    }

    let itemsAddedNames = [];

    for (const itemId of itemIds) {
        const item = menuData.find(i => i.id === itemId);
        if (!item || item.available === false) {
            console.warn(`Item sugerido ${itemId} no disponible.`);
            continue; 
        }

        const existingItem = session.items.find(i => i.id === itemId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            session.items.push({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: 1,
                type: item.type || 'item'
            });
        }
        itemsAddedNames.push(item.name);
    }
    
    // Aplicar descuentos (si aplica)
    const { cart: updatedCart, notification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
    ctx.session.cart = updatedCart;
    
    if (notification && notification.title) {
         await ctx.reply(`*${notification.title}*\n${notification.text}`, { parse_mode: 'Markdown' });
    }
    
    console.log(`Sugerencias añadidas: ${itemsAddedNames.join(', ')}`);
}


module.exports = {
    handleAddItem,
    handleItemInfo,
    handleViewCart,
    handleQuantityChange,
    handleRemoveItem,
    handleConfirmClearCart,
    handleClearCart,
    handleAddSuggestionGroup // 🔥 Exportar la nueva función
};
