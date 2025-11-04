// backend/src/bot/handlers/checkoutHandler.js
const { Markup } = require('telegraf');
const configBotService = require('../services/configBotService');
const DiscountRuleService = require('../../services/discountRuleService');
const availabilityService = require('../../services/availabilityService');
const telegramUserService = require('../services/telegramUserService');
const cartKeyboards = require('../keyboards/cartKeyboards');
const { SESSION_STATES, askForPhone } = require('./orderHandler');
const { db } = require('../../config/firebase');

async function handleContinueToDelivery(ctx, userId, restaurantId) {
    const session = ctx.session?.cart;
    if (!session) {
        await ctx.answerCbQuery('⚠️ Sesión expirada');
        return;
    }

    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const features = restaurantData.features || {};
    const delivery = restaurantData.delivery || {};

    const { message, keyboard } = cartKeyboards.getDeliveryOptionsMessage(features, delivery);

    if (!keyboard) {
        await ctx.answerCbQuery(message, { show_alert: true });
        return;
    }

    session.step = SESSION_STATES.CHOOSING_DELIVERY;

    await ctx.answerCbQuery();
    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
}

async function handleDeliveryYes(ctx, userId) {
    const session = ctx.session?.cart;
    if (!session) {
        await ctx.answerCbQuery('⚠️ Sesión expirada');
        return;
    }

    session.deliveryType = 'delivery';
    session.step = SESSION_STATES.WAITING_LOCATION;

    await ctx.answerCbQuery();

    const { message, keyboard, locationRequestKeyboard } = cartKeyboards.getAskForLocationMessage();

    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
    await ctx.reply('👇 *Presiona el botón:*', { parse_mode: 'Markdown', ...locationRequestKeyboard });
}

async function handlePickup(ctx, userId, restaurantId) {
    const session = ctx.session?.cart;
    if (!session) {
        await ctx.answerCbQuery('⚠️ Sesión expirada');
        return;
    }

    const restaurantData = await configBotService.getRestaurantData(restaurantId);

    session.deliveryType = 'pickup';
    session.delivery = { fee: 0, distanceKm: 0 };

    const { cart: updatedCart } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
    ctx.session.cart = updatedCart;

    await ctx.answerCbQuery('✅ Recoger en Tienda');

    const userInfo = await telegramUserService.getUserInfo(userId);
    await askForPhone(ctx, session, userInfo, restaurantId, true);
}

async function handlePaymentSelection(ctx, callbackData, userId, restaurantId) {
    const session = ctx.session?.cart;
    if (!session) {
        await ctx.answerCbQuery('⚠️ Sesión expirada');
        return;
    }

    const paymentId = callbackData.split('_')[1];
    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const paymentMethods = restaurantData.paymentMethods || [];
    const selectedPayment = paymentMethods.find(pm => pm.id === paymentId);

    if (!selectedPayment) {
        await ctx.answerCbQuery('❌ Método no válido');
        return;
    }

    session.paymentMethod = selectedPayment;
    session.step = SESSION_STATES.FINAL_CONFIRMATION;

    await ctx.answerCbQuery(`✅ ${selectedPayment.name}`);
    await showFinalConfirmation(ctx, restaurantData, true);
}

async function showFinalConfirmation(ctx, restaurantData, isEdit = false) {
    const session = ctx.session?.cart;
    if (!session) {
        await ctx.reply('⚠️ Sesión expirada. Inicia un nuevo pedido con /pedido');
        return;
    }

    const { message, keyboard } = cartKeyboards.getFinalConfirmationMessage(session);

    const options = { parse_mode: 'Markdown', ...keyboard };

    if (isEdit) {
        await ctx.editMessageText(message, options);
    } else {
        await ctx.reply(message, options);
    }
}

async function handleFinalConfirmation(ctx, userId, restaurantId) {
    const session = ctx.session?.cart;
    if (!session) {
        await ctx.answerCbQuery('⚠️ Sesión expirada');
        return;
    }

    const availability = await availabilityService.checkAvailability(restaurantId);
    if (availability.status !== 'open') {
        await ctx.editMessageText('😔 Ya no aceptamos pedidos. Tu pedido no se realizó.');
        return;
    }

    if (session.step === 'PROCESSING') {
        await ctx.answerCbQuery('Procesando...');
        return;
    }

    session.step = 'PROCESSING';
    await ctx.answerCbQuery('⏳ Procesando...');

    try {
        const subtotal = session.subtotal || 0;
        const deliveryFee = session.delivery?.fee || 0;
        const discountAmount = session.discount?.amount || 0;
        const orderTotal = session.total || (subtotal + deliveryFee);

        const orderService = require('../../services/orderService');

        const orderData = {
            info: { location: { coordinates: session.customerLocation || null, formatted_address: session.customerAddress || null } },
            customer: { name: session.customerName || null, telegramId: userId, phone: session.customerPhone },
            items: session.items,
            subtotal,
            deliveryFee,
            discount: discountAmount,
            total: orderTotal,
            deliveryType: session.deliveryType,
            paymentMethod: session.paymentMethod?.id,
            channel: 'telegram',
            status: 'pending',
            notificationsEnabled: true
        };

        const order = await orderService.createOrder(restaurantId, orderData);

        delete ctx.session.cart;

        await telegramUserService.updateUserCommands(ctx, restaurantId);

        const { notificationMessage, notificationKeyboard } = cartKeyboards.getOrderConfirmedMessage(order, orderTotal, restaurantId);

        // Eliminamos el mensaje de "confirmación final"
        await ctx.deleteMessage();

        // Enviamos el mensaje de estado del pedido y guardamos su ID
        const sentMessage = await ctx.reply(notificationMessage, notificationKeyboard);
        if (sentMessage) {
            const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(order.id);
            await orderRef.update({ telegramMessageId: sentMessage.message_id });
        }
    } catch (error) {
        console.error('❌ Error creando pedido:', error);
        session.step = SESSION_STATES.FINAL_CONFIRMATION;
        await ctx.reply('❌ Error al procesar. ¿Reintentar?', Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Sí', 'confirm_final')],
            [Markup.button.callback('❌ No', 'cancel_order')]
        ]));
    }
}

async function handleCancelOrder(ctx, userId) {
    await ctx.answerCbQuery();
    const { message, keyboard } = cartKeyboards.getCancelOrderConfirmationMessage();
    await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
}

async function handleConfirmCancelOrderAction(ctx, userId) {
    delete ctx.session.cart;
    await ctx.answerCbQuery('❌ Cancelado');
    const { message, keyboard } = cartKeyboards.getOrderCancelledMessage();
    await ctx.editMessageText(message, { reply_markup: keyboard });
}

module.exports = {
    handleContinueToDelivery,
    handleDeliveryYes,
    handlePickup,
    handlePaymentSelection,
    showFinalConfirmation,
    handleFinalConfirmation,
    handleCancelOrder,
    handleConfirmCancelOrderAction
};