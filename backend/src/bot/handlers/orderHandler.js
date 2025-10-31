// backend/src/bot/handlers/orderHandler.js - CORREGIDO PARA REDIS SESSION

const menuService = require('../../services/menuService');
const orderService = require('../../services/orderService');
const configBotService = require('../services/configBotService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService');
const deliveryService = require('../../services/deliveryService');
const { Markup } = require('telegraf');
const { showMenuView } = require('./menuHandler');

// Estados de sesión
const SESSION_STATES = {
  SELECTING_ITEM: 'selecting_item',
  SELECTING_QUANTITY: 'selecting_quantity',
  CONFIRMING_ITEMS: 'confirming_items',
  CHOOSING_DELIVERY: 'choosing_delivery',
  WAITING_LOCATION: 'waiting_location',
  WAITING_ADDRESS: 'waiting_address',
  WAITING_PHONE: 'waiting_phone',
  WAITING_NAME: 'waiting_name',
  SELECTING_PAYMENT: 'selecting_payment',
  FINAL_CONFIRMATION: 'final_confirmation'
};

const mainOrderHandler = async (ctx) => {
  try {
    console.log('🛒 [orderHandler] Iniciando...');
    
    const userId = ctx.from.id;
    const restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
    
    if (!restaurantId) {
      console.log('❌ [orderHandler] No se pudo identificar restaurante');
      await ctx.reply('⚠️ No se pudo identificar el restaurante. Usa /start primero.');
      return;
    }

    console.log(`✅ [orderHandler] RestaurantId: ${restaurantId}`);

    // ✅ CRÍTICO: Inicializar sesión si no existe
    if (!ctx.session) {
      console.log('⚠️ [orderHandler] Sesión no existía, creando...');
      ctx.session = {};
    }

    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const features = restaurantData.features || {};

    // === MANEJO DE UBICACIÓN ===
    if (ctx.message && ctx.message.location) {
      console.log('📍 [orderHandler] Procesando ubicación');
      return await handleLocationMessage(ctx, userId, restaurantId, restaurantData);
    }

    // === MANEJO DE TEXTO ===
    if (ctx.message && ctx.message.text && !ctx.message.text.startsWith('/')) {
      console.log('📝 [orderHandler] Procesando texto:', ctx.message.text.substring(0, 50));
      return await handleTextMessage(ctx, userId, restaurantId, features);
    }

    // === VERIFICAR DISPONIBILIDAD ===
    const availability = await availabilityService.checkAvailability(restaurantId);
    if (availability.status !== 'open') {
      console.log('🔒 [orderHandler] Restaurante cerrado:', availability.reason);
      let messageToSend = '😔 Lo sentimos, no podemos aceptar pedidos en este momento.';
      if (availability.reason) {
        messageToSend += `\n\n📋 Motivo: ${availability.reason}`;
      }
      await ctx.reply(messageToSend);
      return;
    }

    // === INICIAR NUEVO PEDIDO ===
    console.log('📋 [orderHandler] Obteniendo menú...');
    const menuItems = await menuService.getMenuForBot(restaurantId);
    console.log(`📋 [orderHandler] Items obtenidos: ${menuItems?.length || 0}`);
    
    if (!menuItems || menuItems.length === 0) {
      await ctx.reply('😔 Lo sentimos, el menú aún no está disponible.');
      return;
    }

    // ✅ Crear carrito en sesión (Redis lo persistirá automáticamente)
    console.log('🛒 [orderHandler] Creando carrito en sesión...');
    ctx.session.cart = {
      restaurantId,
      items: [],
      step: SESSION_STATES.SELECTING_ITEM,
      deliveryType: null,
      customerLocation: null,
      customerAddress: null,
      customerPhone: null,
      customerName: ctx.from.first_name,
      delivery: null,
      createdAt: new Date().toISOString()
    };

    console.log('✅ [orderHandler] Carrito creado, mostrando menú...');
    
    // Mostrar menú paginado
    await showMenuView(ctx, 1, false);

  } catch (error) {
    console.error('❌ [orderHandler] Error:', error);
    await ctx.reply('❌ Hubo un error. Por favor intenta nuevamente.').catch(console.error);
  }
};

// === MANEJO DE UBICACIÓN ===
async function handleLocationMessage(ctx, userId, restaurantId, restaurantData) {
  console.log('📍 [handleLocationMessage] Procesando ubicación...');
  
  const session = ctx.session?.cart;
  
  if (!session) {
    console.log('⚠️ [handleLocationMessage] No hay sesión activa');
    await ctx.reply('🤔 No hay un pedido activo. Usa /pedido para comenzar.');
    return;
  }
  
  if (session.step !== SESSION_STATES.WAITING_LOCATION) {
    console.log('⚠️ [handleLocationMessage] No se esperaba ubicación, estado:', session.step);
    await ctx.reply('🤔 No estoy esperando una ubicación en este momento.');
    return;
  }

  const { latitude, longitude } = ctx.message.location;
  session.customerLocation = { latitude, longitude };
  
  console.log(`📍 [handleLocationMessage] Ubicación: ${latitude}, ${longitude}`);
  await ctx.reply('📍 Ubicación recibida, calculando costo de envío...');

  try {
    const result = await deliveryService.calculateFee(restaurantId, session.customerLocation);
    console.log(`📏 [handleLocationMessage] Distancia: ${result.distanceKm}km, Tarifa: $${result.fee}`);
    
    if (!result.withinMaxDistance) {
      console.log('❌ [handleLocationMessage] Fuera de rango de entrega');
      await ctx.reply(
        '😔 Lo sentimos, tu ubicación está fuera de nuestra zona de entrega.\n\n' +
        `📏 Distancia: ${result.distanceKm.toFixed(2)} km\n` +
        `🚗 Máxima distancia: ${restaurantData.delivery?.maxDistance || 10} km\n\n` +
        '¿Deseas cambiar a *Recoger en tienda*?',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🏪 Recoger en tienda', 'change_to_pickup')],
            [Markup.button.callback('❌ Cancelar pedido', 'cancel_order')]
          ])
        }
      );
      return;
    }

    session.delivery = { 
      fee: result.fee, 
      distanceKm: result.distanceKm 
    };
    
    const subtotal = session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const freeDeliveryMin = restaurantData.delivery?.freeDeliveryMinAmount || 0;
    
    if (freeDeliveryMin > 0 && subtotal >= freeDeliveryMin) {
      session.delivery.fee = 0;
      console.log('🎉 [handleLocationMessage] Envío gratis aplicado');
      await ctx.reply(
        `🎉 ¡Felicidades! Tu pedido califica para *envío gratis*\n\n` +
        `📏 Distancia: ${result.distanceKm.toFixed(2)} km\n` +
        `💰 Costo de envío: ~$${result.fee}~ ¡GRATIS!\n\n` +
        `✨ Subtotal: $${subtotal.toFixed(2)} (mínimo: $${freeDeliveryMin})`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        `📍 *Ubicación confirmada*\n\n` +
        `📏 Distancia: ${result.distanceKm.toFixed(2)} km\n` +
        `💰 Costo de envío: $${result.fee.toFixed(2)}\n\n` +
        `💡 _Envío gratis en pedidos mayores a $${freeDeliveryMin}_`,
        { parse_mode: 'Markdown' }
      );
    }

    const features = restaurantData.features || {};
    
    if (features.requireLocationIfDelivery) {
      session.step = SESSION_STATES.WAITING_ADDRESS;
      console.log('📝 [handleLocationMessage] Pidiendo dirección');
      await ctx.reply(
        '📝 Por favor, escribe tu dirección completa:\n\n' +
        '_(Ejemplo: Calle 5 de Mayo #123, Col. Centro)_',
        { parse_mode: 'Markdown' }
      );
    } else {
      session.step = SESSION_STATES.WAITING_PHONE;
      console.log('📞 [handleLocationMessage] Pidiendo teléfono');
      await ctx.reply('📞 Por favor, escribe tu número de teléfono:');
    }

  } catch (err) {
    console.error('❌ [handleLocationMessage] Error calculando tarifa:', err);
    await ctx.reply(
      '❌ Error calculando envío. Por favor intenta nuevamente.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🏪 Recoger en tienda', 'change_to_pickup')],
        [Markup.button.callback('❌ Cancelar pedido', 'cancel_order')]
      ])
    );
  }
}

// === MANEJO DE TEXTO ===
async function handleTextMessage(ctx, userId, restaurantId, features) {
  console.log('📝 [handleTextMessage] Procesando texto...');
  
  const session = ctx.session?.cart;
  
  if (!session) {
    console.log('⚠️ [handleTextMessage] No hay sesión activa');
    return; // No hacer nada si no hay pedido activo
  }

  const text = ctx.message.text.trim();
  console.log(`📝 [handleTextMessage] Estado: ${session.step}, Texto: "${text.substring(0, 50)}"`);

  switch (session.step) {
    case SESSION_STATES.WAITING_ADDRESS:
      if (text.length < 10) {
        await ctx.reply('📝 Por favor proporciona una dirección más completa (mínimo 10 caracteres).');
        return;
      }
      session.customerAddress = text;
      console.log('✅ [handleTextMessage] Dirección guardada');
      
      if (features.askForPhone) {
        session.step = SESSION_STATES.WAITING_PHONE;
        await ctx.reply('📞 Perfecto. Ahora escribe tu número de teléfono:');
      } else {
        session.step = SESSION_STATES.SELECTING_PAYMENT;
        await askPaymentMethod(ctx, session, restaurantId);
      }
      break;
      
    case SESSION_STATES.WAITING_PHONE:
      const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/;
      if (!phoneRegex.test(text)) {
        await ctx.reply('📞 Por favor proporciona un número de teléfono válido.');
        return;
      }
      session.customerPhone = text;
      console.log('✅ [handleTextMessage] Teléfono guardado');
      
      if (features.askForName && !session.customerName) {
        session.step = SESSION_STATES.WAITING_NAME;
        await ctx.reply('👤 Por último, ¿cuál es tu nombre completo?');
      } else {
        session.step = SESSION_STATES.SELECTING_PAYMENT;
        await askPaymentMethod(ctx, session, restaurantId);
      }
      break;
      
    case SESSION_STATES.WAITING_NAME:
      if (text.length < 2) {
        await ctx.reply('👤 Por favor proporciona un nombre válido.');
        return;
      }
      session.customerName = text;
      console.log('✅ [handleTextMessage] Nombre guardado');
      session.step = SESSION_STATES.SELECTING_PAYMENT;
      await askPaymentMethod(ctx, session, restaurantId);
      break;
      
    default:
      console.log(`⚠️ [handleTextMessage] Estado no manejado: ${session.step}`);
      break;
  }
}

// === MÉTODOS DE PAGO ===
async function askPaymentMethod(ctx, session, restaurantId) {
  console.log('💳 [askPaymentMethod] Mostrando métodos de pago...');
  
  const restaurantData = await configBotService.getRestaurantData(restaurantId);
  const paymentMethods = restaurantData.paymentMethods || [];
  const enabledMethods = paymentMethods.filter(pm => pm.enabled);
  
  if (enabledMethods.length === 0) {
    console.log('⚠️ [askPaymentMethod] No hay métodos de pago configurados');
    await ctx.reply('⚠️ No hay métodos de pago configurados. Por favor contacta al restaurante.');
    return;
  }

  const buttons = enabledMethods.map(pm =>
    [Markup.button.callback(`💳 ${pm.name}`, `payment_${pm.id}`)]
  );
  
  console.log(`✅ [askPaymentMethod] Mostrando ${enabledMethods.length} métodos de pago`);
  
  await ctx.reply(
    '💳 *Selecciona tu método de pago:*',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
}

// Exportar
module.exports = mainOrderHandler;
module.exports.SESSION_STATES = SESSION_STATES;
module.exports.handleLocationMessage = handleLocationMessage;
module.exports.handleTextMessage = handleTextMessage;
module.exports.askPaymentMethod = askPaymentMethod;