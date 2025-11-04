// backend/src/bot/handlers/orderHandler.js
const menuService = require('../../services/menuService');
const configBotService = require('../services/configBotService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService');
const deliveryService = require('../../services/deliveryService');
const { Markup } = require('telegraf');
const { showMenuView } = require('./menuHandler');
const orderKeyboards = require('../keyboards/orderKeyboards'); // Importamos

// Estados de sesión
const SESSION_STATES = {
  SELECTING_ITEM: 'selecting_item',
  CHOOSING_DELIVERY: 'choosing_delivery',
  WAITING_LOCATION: 'waiting_location',
  WAITING_PHONE: 'waiting_phone',
  CONFIRMING_PHONE: 'confirming_phone',
  SELECTING_PAYMENT: 'selecting_payment',
  FINAL_CONFIRMATION: 'final_confirmation',
  // (Añade otros estados si los tienes)
};

const mainOrderHandler = async (ctx) => {
  try {
    await ctx.replyWithChatAction('typing');
    const userId = ctx.from.id;

    if (!ctx.state.restaurantId) {
      ctx.state.restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
    }
    const restaurantId = ctx.state.restaurantId;

    if (!restaurantId) {
      await ctx.reply('⚠️ No se pudo identificar el restaurante. Usa /start primero.');
      return;
    }
    
    if (!ctx.session) {
      ctx.session = {};
    }

    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const features = restaurantData.features || {};

    // === MANEJO DE UBICACIÓN ===
    if (ctx.message && ctx.message.location) {
      return await handleLocationMessage(ctx, userId, restaurantId, restaurantData);
    }

    // === MANEJO DE TEXTO Y CONTACTO ===
    if (ctx.message && ((ctx.message.text && !ctx.message.text.startsWith('/')) || ctx.message.contact)) {
      return await handleTextMessage(ctx, userId, restaurantId, features);
    }

    // === VERIFICAR DISPONIBILIDAD ===
    const availability = await availabilityService.checkAvailability(restaurantId);
    if (availability.status !== 'open') {
      let messageToSend = '😔 Lo sentimos, no podemos aceptar pedidos en este momento.';
      if (availability.reason) {
        messageToSend += `\n\n📋 Motivo: ${availability.reason}`;
      }
      await ctx.reply(messageToSend);
      return;
    }

    // === INICIAR NUEVO PEDIDO ===
    const menuItems = await menuService.getMenuForBot(restaurantId);
    if (!menuItems || menuItems.length === 0) {
      await ctx.reply('😔 Lo sentimos, el menú aún no está disponible.');
      return;
    }

    // Crear carrito en sesión
    ctx.session.cart = {
      restaurantId,
      items: [],
      step: SESSION_STATES.SELECTING_ITEM,
      customerName: ctx.from.first_name,
      createdAt: new Date().toISOString()
      // ... (otros campos)
    };
    
    await showMenuView(ctx, 1, false);
  } catch (error) {
    console.error('❌ [orderHandler] Error:', error);
    await ctx.reply('❌ Hubo un error. Por favor intenta nuevamente.').catch(console.error);
  }
};

// === MANEJO DE UBICACIÓN ===
async function handleLocationMessage(ctx, userId, restaurantId, restaurantData) {
  const session = ctx.session?.cart;
  if (!session || session.step !== SESSION_STATES.WAITING_LOCATION) {
    await ctx.reply('🤔 No estoy esperando una ubicación en este momento.');
    return;
  }

  const { latitude, longitude } = ctx.message.location;
  session.customerLocation = { latitude, longitude };
  
  await ctx.reply('📍 Ubicación recibida, calculando costo de envío...', {
    reply_markup: { remove_keyboard: true }
  });
  
  try {
    const result = await deliveryService.calculateFee(restaurantId, session.customerLocation);
    
    if (!result.withinMaxDistance) {
        const { message, keyboard } = orderKeyboards.getOutOfDeliveryRangeMessage(result, restaurantData);
        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
        return;
    }

    session.delivery = { fee: result.fee, distanceKm: result.distanceKm };
    const subtotal = session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const freeDeliveryMin = restaurantData.delivery?.freeDeliveryMinAmount || 0;

    if (freeDeliveryMin > 0 && subtotal >= freeDeliveryMin) {
        session.delivery.fee = 0;
        const { message } = orderKeyboards.getFreeDeliveryMessage(result, subtotal, freeDeliveryMin);
        await ctx.reply(message, { parse_mode: 'Markdown' });
    } else {
        const { message } = orderKeyboards.getDeliveryFeeMessage(result, freeDeliveryMin);
        await ctx.reply(message, { parse_mode: 'Markdown' });
    }

    const userInfo = await telegramUserService.getUserInfo(userId);
    await askForPhone(ctx, session, userInfo, restaurantId);

  } catch (err) {
    console.error('❌ [handleLocationMessage] Error calculando tarifa:', err);
    const { message, keyboard } = orderKeyboards.getDeliveryErrorMessage();
    await ctx.reply(message, { ...keyboard });
  }
}

// === MANEJO DE TEXTO Y CONTACTO ===
async function handleTextMessage(ctx, userId, restaurantId, features) {
  const session = ctx.session?.cart;
  if (!session) return; // No hacer nada si no hay pedido activo

  // Manejo de mensaje de contacto
  if (ctx.message.contact) {
    if (ctx.message.contact.user_id !== userId) {
      await ctx.reply('Por favor, comparte tu propio número de teléfono.');
      return;
    }
    const contactPhone = ctx.message.contact.phone_number;
    if (contactPhone) {
      // 🔥 Guardar el teléfono en la base de datos para futuros pedidos
      await telegramUserService.updateUserPhone(userId, contactPhone);
      await ctx.reply(`📞 ¡Número de contacto recibido!`, { reply_markup: { remove_keyboard: true } });
      session.customerPhone = contactPhone;
      // 🔥 CORRECCIÓN: Avanzar directamente al siguiente paso
      session.step = SESSION_STATES.SELECTING_PAYMENT;
      await askPaymentMethod(ctx, session, restaurantId, false);
    } else {
      await ctx.reply('No se pudo extraer el número. Por favor, ingrésalo manualmente.');
      const userInfo = await telegramUserService.getUserInfo(userId);
      await askForPhone(ctx, session, userInfo, restaurantId);
    }
    return;
  }

  const text = ctx.message.text?.trim();
  switch (session.step) {
    case SESSION_STATES.WAITING_PHONE:
      const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/;
      if (!text || !phoneRegex.test(text)) {
        await ctx.reply('📞 Por favor proporciona un número de teléfono válido.');
        return;
      }
      session.customerPhone = text;

      // 🔥 Guardar el teléfono en la base de datos para futuros pedidos
      await telegramUserService.updateUserPhone(userId, text);

      // 🔥 CORRECCIÓN: Avanzar directamente al siguiente paso
      session.step = SESSION_STATES.SELECTING_PAYMENT;
      await askPaymentMethod(ctx, session, restaurantId, false);
      break;
    
    // ... (otros casos como WAITING_ADDRESS, WAITING_NAME)
    
    default:
      console.log(`⚠️ [handleTextMessage] Estado no manejado: ${session.step}`);
      break;
  }
}

// === MÉTODOS DE PAGO ===
async function askPaymentMethod(ctx, session, restaurantId, isEdit = false) {
  const restaurantData = await configBotService.getRestaurantData(restaurantId);
  const paymentMethods = restaurantData.paymentMethods || [];
  const enabledMethods = paymentMethods.filter(pm => pm.enabled);

  let message, keyboard;
  if (enabledMethods.length === 0) {
      ({ message, keyboard } = orderKeyboards.getNoPaymentMethodsMessage());
  } else {
      ({ message, keyboard } = orderKeyboards.getAskPaymentMethodMessage(enabledMethods));
  }

  const options = { parse_mode: 'Markdown', ...keyboard };
  
  if (isEdit) {
    try {
      await ctx.editMessageText(message, options);
    } catch (error) {
      if (error.description && error.description.includes('message is not modified')) {
        await ctx.answerCbQuery().catch(console.error);
      } else {
        throw error;
      }
    }
  } else {
    await ctx.reply(message, options);
  }
}

// === PEDIR TELÉFONO (INTELIGENTE) ===
async function askForPhone(ctx, session, userInfo, restaurantId, isEdit = false) {
  const restaurantData = await configBotService.getRestaurantData(restaurantId);
  const features = restaurantData.features || {};

  if (!features.askForPhone) {
    session.step = SESSION_STATES.SELECTING_PAYMENT;
    await askPaymentMethod(ctx, session, restaurantId);
    return;
  }
  
  // 🔥 LÓGICA MEJORADA: Prioriza el teléfono guardado en la base de datos.
  const savedPhone = userInfo?.phone;
  let message, keyboard;

  if (savedPhone) {
    // Si ya hay un teléfono guardado, lo usamos directamente sin preguntar.
    console.log(`[askForPhone] Usando teléfono guardado: ${savedPhone}`);
    session.customerPhone = savedPhone;
    session.step = SESSION_STATES.SELECTING_PAYMENT;
    await askPaymentMethod(ctx, session, restaurantId, isEdit);
  } else {
    // Si no hay teléfono guardado, lo solicitamos.
    console.log('[askForPhone] No se encontró teléfono. Solicitando...');
    session.step = SESSION_STATES.WAITING_PHONE;
    ({ message, keyboard } = orderKeyboards.getAskForPhoneMessage());
    
    const options = { parse_mode: 'Markdown', ...keyboard };
    if (isEdit) {
      try {
        await ctx.deleteMessage();
      } catch (e) {
        console.warn('No se pudo borrar el mensaje anterior al pedir el teléfono.');
      }
      await ctx.reply(message, options);
    } else {
        await ctx.reply(message, options);
    }
  }
}

// Exportar
module.exports = mainOrderHandler;
module.exports.SESSION_STATES = SESSION_STATES;
module.exports.handleLocationMessage = handleLocationMessage;
module.exports.handleTextMessage = handleTextMessage;
module.exports.askPaymentMethod = askPaymentMethod;
module.exports.askForPhone = askForPhone;