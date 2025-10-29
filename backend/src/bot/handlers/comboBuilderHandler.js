// backend/src/bot/handlers/comboBuilderHandler.js
// ❌ const apiClient = require('../../services/apiClient');
const menuService = require('../../services/menuService'); // ✅ IMPORTAR SERVICIO
const telegramUserService = require('../services/telegramUserService'); // ✅ IMPORTAR SERVICIO
const { Markup } = require('telegraf');

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
        await ctx.reply('❌ Ocurrió un error al intentar armar el combo. Por favor, intenta de nuevo.');
        if (ctx.session) delete ctx.session.comboBuilder; // Clean up session
    }
}

async function startNewCombo(ctx, comboId) {
    // ❌ Llamada a apiClient eliminada
    // const response = await apiClient.post('/chatbot/get-combo-components', { combo_id: comboId });
    // const comboData = response.data;

    // ✅ Llamada directa al servicio
    const restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
    const combo = await menuService.getMenuCombo(restaurantId, comboId);

    if (!combo || !combo.componentes || combo.componentes.length === 0) {
        return await ctx.editMessageText('⚠️ Este combo no está disponible o no tiene opciones configuradas.');
    }

    // ✅ Recrear la estructura de datos que el handler esperaba
    const comboData = {
        nombre_combo: combo.name,
        precio_fijo: combo.price, // El botController se olvidó de este campo, pero el handler lo necesita
        componentes: (combo.componentes || []).map(c => ({
            titulo_pregunta: c.title,
            // Asumimos que c.items_opciones es un array de {id, name} como en el controller
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
        return await ctx.editMessageText('⚠️ Tu sesión para armar el combo ha expirado o es inválida. Por favor, iníciala de nuevo.');
    }

    const component = builder.components[step];
    const selectedOption = component.items_opciones.find(opt => opt.id === itemId);
    if (!selectedOption) {
        return await ctx.answerCbQuery('❌ Opción no válida.', { show_alert: true });
    }
    
    builder.selections[step] = {
        title: component.titulo_pregunta,
        item: selectedOption // selectedOption ya tiene { id, nombre }
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
        // opt.nombre ya está en el formato correcto
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

    let orderSession = ctx.session.cart;

    if (!orderSession) {
        orderSession = {
            items: [],
            // Requerimos telegramUserService aquí para evitar dependencia circular en la carga inicial
            restaurantId: await require('../services/telegramUserService').getRestaurantIdByBotContext(ctx),
            step: 'selecting_item' 
        };
        ctx.session.cart = orderSession;
  G  }

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
    
    delete ctx.session.comboBuilder;
}

module.exports = {
    handleComboBuilder
};