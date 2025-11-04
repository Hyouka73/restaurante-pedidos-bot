// backend/src/bot/handlers/comboBuilderHandler.js
const menuService = require('../../services/menuService');
const telegramUserService = require('../services/telegramUserService');
const comboBuilderKeyboards = require('../keyboards/comboBuilderKeyboards');

async function handleComboBuilder(ctx) {
    try {
        await ctx.answerCbQuery();
        const callbackData = ctx.callbackQuery.data;
        const parts = callbackData.split(':');
        const action = parts[0];
        if (action === 'build_combo') {
            await startNewCombo(ctx, parts[1]);
        } else if (action === 'combo_select') {
            await handleSelection(ctx, parts[1], parts[2]);
        }
    } catch (error) {
        console.error('Error in comboBuilderHandler:', error.response ? error.response.data : error.message);
        const { message } = comboBuilderKeyboards.getErrorMessage();
        await ctx.reply(message);
        if (ctx.session) delete ctx.session.comboBuilder;
    }
}

async function startNewCombo(ctx, comboId) {
    const restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
    const combo = await menuService.getMenuCombo(restaurantId, comboId);

    if (!combo || !combo.componentes || combo.componentes.length === 0) {
        const { message } = comboBuilderKeyboards.getComboUnavailableMessage();
        return await ctx.editMessageText(message);
    }

    const comboData = {
        nombre_combo: combo.name,
        precio_fijo: combo.price,
        componentes: (combo.componentes || []).map(c => ({
            titulo_pregunta: c.title,
            items_opciones: c.items_opciones.map(item => ({ id: item.id, nombre: item.name }))
        }))
    };

    ctx.session.comboBuilder = {
        comboId: comboId,
        name: comboData.nombre_combo,
        price: comboData.precio_fijo,
        components: comboData.componentes,
        selections: [],
        currentStep: 0
    };
    await askNextComponentQuestion(ctx);
}

async function handleSelection(ctx, stepStr, itemId) {
    const step = parseInt(stepStr, 10);
    const builder = ctx.session.comboBuilder;
    if (!builder || builder.currentStep !== step) {
        const { message } = comboBuilderKeyboards.getInvalidSessionMessage();
        return await ctx.editMessageText(message);
    }

    const component = builder.components[step];
    const selectedOption = component.items_opciones.find(opt => opt.id === itemId);
    if (!selectedOption) {
        return await ctx.answerCbQuery('❌ Opción no válida.', { show_alert: true });
    }

    builder.selections[step] = {
        title: component.titulo_pregunta,
        item: selectedOption
    };
    builder.currentStep++;

    if (builder.currentStep < builder.components.length) {
        await askNextComponentQuestion(ctx);
    } else {
        await finalizeCombo(ctx);
    }
}

async function askNextComponentQuestion(ctx) {
    const builder = ctx.session.comboBuilder;
    const { message, keyboard } = comboBuilderKeyboards.getNextComponentQuestionMessage(builder);
    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
}

async function finalizeCombo(ctx) {
    const builder = ctx.session.comboBuilder;

    let orderSession = ctx.session.cart;

    if (!orderSession) {
        orderSession = {
            items: [],
            restaurantId: await require('../services/telegramUserService').getRestaurantIdByBotContext(ctx),
            step: 'selecting_item'
        };
        ctx.session.cart = orderSession;
    }

    const selectionNames = builder.selections.map(sel => sel.item.nombre).join(', ');
    const comboDisplayName = `${builder.name} (${selectionNames})`;

    orderSession.items.push({
        id: builder.comboId,
        name: comboDisplayName,
        price: builder.price,
        quantity: 1,
        type: 'combo',
        isCombo: true,
        selectedComponents: builder.selections.map(s => ({ title: s.title, itemName: s.item.nombre }))
    });

    const { message, keyboard } = comboBuilderKeyboards.getFinalizeComboMessage(builder);

    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });

    delete ctx.session.comboBuilder;
}

module.exports = {
    handleComboBuilder
};