// backend/src/bot/handlers/comboBuilderHandler.js
const apiClient = require('../../services/apiClient');
const { userOrderSessions } = require('./orderHandler');
const { Markup } = require('telegraf');

async function handleComboBuilder(ctx) {
    try {
        await ctx.answerCbQuery();
        const callbackData = ctx.callbackQuery.data;
        const parts = callbackData.split(':'); // build_combo:combo_id OR combo_select:step:itemId
        const action = parts[0];

        if (action === 'build_combo') {
            await startNewCombo(ctx, parts[1]);
        } else if (action === 'combo_select') {
            await handleSelection(ctx, parts[1], parts[2]);
        }
    } catch (error) {
        console.error('Error in comboBuilderHandler:', error.response ? error.response.data : error.message);
        await ctx.reply('❌ Ocurrió un error al intentar armar el combo. Por favor, intenta de nuevo.');
        if (ctx.session) delete ctx.session.comboBuilder; // Clean up session
    }
}

async function startNewCombo(ctx, comboId) {
    const response = await apiClient.post('/chatbot/get-combo-components', { combo_id: comboId });
    const comboData = response.data;

    if (!comboData || !comboData.componentes || comboData.componentes.length === 0) {
        return await ctx.editMessageText('⚠️ Este combo no está disponible o no tiene opciones configuradas.');
    }

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
        return await ctx.editMessageText('⚠️ Tu sesión para armar el combo ha expirado o es inválida. Por favor, iníciala de nuevo.');
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
    const step = builder.currentStep;
    const component = builder.components[step];

    const buttons = component.items_opciones.map(opt =>
        Markup.button.callback(opt.nombre, `combo_select:${step}:${opt.id}`)
    );

    const message = `*Paso ${step + 1} de ${builder.components.length}:*\n${component.titulo_pregunta}`;

    await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons, { columns: 2 })
    });
}

async function finalizeCombo(ctx) {
    const builder = ctx.session.comboBuilder;
    const userId = ctx.from.id;

    // Ensure there's a main order session
    let orderSession = userOrderSessions.get(userId);
    if (!orderSession) {
        // If no order session, create a basic one
        orderSession = {
            items: [],
            restaurantId: await require('../services/telegramUserService').getRestaurantIdByBotContext(ctx)
        };
        userOrderSessions.set(userId, orderSession);
    }

    // Construct the combo name with selections
    const selectionNames = builder.selections.map(sel => sel.item.nombre).join(', ');
    const comboDisplayName = `${builder.name} (${selectionNames})`;

    // Add to cart
    orderSession.items.push({
        id: builder.comboId,
        name: comboDisplayName,
        price: builder.price,
        quantity: 1,
        type: 'combo',
        isCombo: true,
        // Store selections for order details
        selectedComponents: builder.selections.map(s => ({ title: s.title, itemName: s.item.nombre }))
    });
    userOrderSessions.set(userId, orderSession);

    // Show summary to user
    let summary = `*¡Combo "${builder.name}" armado!*\n\n`;
    summary += 'Tus selecciones:\n';
    builder.selections.forEach(sel => {
        summary += `*${sel.title}:* ${sel.item.nombre}\n`;
    });
    summary += `\n*Precio del combo: $${builder.price.toFixed(2)}*`;

    await ctx.editMessageText(summary, { parse_mode: 'Markdown' });

    await ctx.reply('¡Combo añadido a tu carrito! 🛒', Markup.inlineKeyboard([
        Markup.button.callback('Ver mi pedido', 'view_cart'),
        Markup.button.callback('Seguir comprando', 'show_menu')
    ]));

    // Clean up combo builder session
    delete ctx.session.comboBuilder;
}

module.exports = {
    handleComboBuilder
};