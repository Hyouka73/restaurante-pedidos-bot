// backend/src/bot/handlers/orderHandler.js
const menuService = require('../../services/menuService');
const orderService = require('../../services/orderService');
const configBotService = require('../services/configBotService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService');
const deliveryService = require('../../services/deliveryService');
const { Markup } = require('telegraf');

// Almacenamiento temporal de sesiones (en producción usar Redis o Firestore)
const userOrderSessions = new Map();

// Constantes para estados de sesión
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

module.exports = async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const restaurantId = await telegramUserService.getRestaurantIdByChat(chatId);

    // Obtener configuración del restaurante
    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const features = restaurantData.features || {};

    // === MANEJO DE UBICACIÓN ===
    if (ctx.message && ctx.message.location) {
      return await handleLocationMessage(ctx, userId, restaurantId, restaurantData);
    }

    // === MANEJO DE TEXTO (dirección, teléfono, nombre) ===
    if (ctx.message && ctx.message.text && !ctx.message.text.startsWith('/')) {
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
    const menuItems = await menuService.getMenu(restaurantId);
    if (menuItems.length === 0) {
      await ctx.reply('😔 Lo sentimos, el menú aún no está disponible.');
      return;
    }

    // Crear nueva sesión
    userOrderSessions.set(userId, {
      restaurantId,
      items: [],
      step: SESSION_STATES.SELECTING_ITEM,
      deliveryType: null,
      customerLocation: null,
      customerAddress: null,
      customerPhone: null,
      customerName: ctx.from.first_name,
      delivery: null
    });

    // Mostrar menú con fotos si están disponibles
    await sendMenuWithPhotos(ctx, menuItems, features);

  } catch (error) {
    console.error('Error en orderHandler:', error);
    await ctx.reply('❌ Hubo un error al iniciar tu pedido. Por favor intenta nuevamente.');
  }
};

// === FUNCIÓN PARA ENVIAR MENÚ CON FOTOS ===
async function sendMenuWithPhotos(ctx, menuItems, features) {
  await ctx.reply(
    '🛒 *¡Perfecto! Comencemos tu pedido*\n\n' +
    '👇 Selecciona los platillos que deseas ordenar:',
    { parse_mode: 'Markdown' }
  );

  // Enviar cada item con foto si está disponible
  for (const item of menuItems) {
    const description = item.description || 'Delicioso platillo';
    const price = `💰 $${item.price}`;
    const available = item.available !== false ? '✅ Disponible' : '❌ No disponible';
    
    const caption = 
      `*${item.name}*\n\n` +
      `${description}\n\n` +
      `${price}\n` +
      `${available}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🛒 Agregar al pedido', `add_item_${item.id}`)],
      [Markup.button.callback('ℹ️ Más información', `item_info_${item.id}`)]
    ]);

    try {
      if (features.showMenuImages && item.imageUrl) {
        await ctx.replyWithPhoto(item.imageUrl, {
          caption,
          parse_mode: 'Markdown',
          ...keyboard
        });
      } else {
        await ctx.reply(caption, {
          parse_mode: 'Markdown',
          ...keyboard
        });
      }
    } catch (error) {
      console.error(`Error enviando item ${item.id}:`, error);
      // Fallback sin foto
      await ctx.reply(caption, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  }

  // Botón para finalizar selección
  await ctx.reply(
    '➡️ Cuando termines de seleccionar, presiona "Ver Carrito"',
    Markup.inlineKeyboard([
      [Markup.button.callback('🛒 Ver Carrito', 'view_cart')],
      [Markup.button.callback('❌ Cancelar Pedido', 'cancel_order')]
    ])
  );
}

// === MANEJO DE UBICACIÓN ===
async function handleLocationMessage(ctx, userId, restaurantId, restaurantData) {
  const session = userOrderSessions.get(userId);
  
  if (!session || session.step !== SESSION_STATES.WAITING_LOCATION) {
    await ctx.reply('🤔 No estoy esperando una ubicación en este momento.');
    return;
  }

  const { latitude, longitude } = ctx.message.location;
  session.customerLocation = { latitude, longitude };

  await ctx.reply('📍 Ubicación recibida, calculando costo de envío...');

  try {
    const result = await deliveryService.calculateFee(restaurantId, session.customerLocation);
    
    if (!result.withinMaxDistance) {
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
    
    // Verificar si aplica envío gratis
    const subtotal = session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const freeDeliveryMin = restaurantData.delivery?.freeDeliveryMinAmount || 0;
    
    if (freeDeliveryMin > 0 && subtotal >= freeDeliveryMin) {
      session.delivery.fee = 0;
      await ctx.reply(
        `🎉 ¡Felicidades! Tu pedido califica para *envío gratis*\n\n` +
        `📏 Distancia: ${result.distanceKm.toFixed(2)} km\n` +
        `💰 Costo de envío: ~$${result.fee}~ ¡GRATIS!\n\n` +
        `✨ Subtotal: $${subtotal} (mínimo para envío gratis: $${freeDeliveryMin})`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        `📍 *Ubicación confirmada*\n\n` +
        `📏 Distancia al restaurante: ${result.distanceKm.toFixed(2)} km\n` +
        `💰 Costo de envío: $${result.fee}\n\n` +
        `💡 _Envío gratis en pedidos mayores a $${freeDeliveryMin}_`,
        { parse_mode: 'Markdown' }
      );
    }

    // Pedir dirección si está habilitado
    const features = restaurantData.features || {};
    if (features.requireLocationIfDelivery) {
      session.step = SESSION_STATES.WAITING_ADDRESS;
      await ctx.reply(
        '📝 Por favor, escribe tu dirección completa para la entrega:\n\n' +
        '_(Ejemplo: Calle 5 de Mayo #123, Col. Centro, entre Juárez e Hidalgo)_',
        { parse_mode: 'Markdown' }
      );
    } else {
      session.step = SESSION_STATES.WAITING_PHONE;
      await ctx.reply('📞 Por favor, escribe tu número de teléfono:');
    }
    
    userOrderSessions.set(userId, session);

  } catch (err) {
    console.error('Error calculando tarifa:', err);
    await ctx.reply(
      '❌ Error calculando tarifa de envío. Por favor intenta nuevamente o selecciona "Recoger en tienda".',
      Markup.inlineKeyboard([
        [Markup.button.callback('🏪 Recoger en tienda', 'change_to_pickup')],
        [Markup.button.callback('❌ Cancelar pedido', 'cancel_order')]
      ])
    );
  }
}

// === MANEJO DE MENSAJES DE TEXTO ===
async function handleTextMessage(ctx, userId, restaurantId, features) {
  const session = userOrderSessions.get(userId);
  if (!session) return;

  const text = ctx.message.text.trim();

  switch (session.step) {
    case SESSION_STATES.WAITING_ADDRESS:
      if (text.length < 10) {
        await ctx.reply('📝 Por favor proporciona una dirección más completa (mínimo 10 caracteres).');
        return;
      }
      session.customerAddress = text;
      
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
      session.step = SESSION_STATES.SELECTING_PAYMENT;
      await askPaymentMethod(ctx, session, restaurantId);
      break;

    default:
      // Ignorar mensajes de texto en otros estados
      break;
  }

  userOrderSessions.set(userId, session);
}

// === MOSTRAR MÉTODOS DE PAGO ===
async function askPaymentMethod(ctx, session, restaurantId) {
  const restaurantData = await configBotService.getRestaurantData(restaurantId);
  const paymentMethods = restaurantData.paymentMethods || [];
  const enabledMethods = paymentMethods.filter(pm => pm.enabled);

  if (enabledMethods.length === 0) {
    await ctx.reply('⚠️ No hay métodos de pago configurados. Por favor contacta al restaurante.');
    return;
  }

  const buttons = enabledMethods.map(pm => 
    [Markup.button.callback(`💳 ${pm.name}`, `payment_${pm.id}`)]
  );

  await ctx.reply(
    '💳 *Selecciona tu método de pago:*',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
}

// Exportar funciones auxiliares para interactionHandler
module.exports.userOrderSessions = userOrderSessions;
module.exports.SESSION_STATES = SESSION_STATES;
module.exports.sendMenuWithPhotos = sendMenuWithPhotos;
module.exports.handleLocationMessage = handleLocationMessage;
module.exports.handleTextMessage = handleTextMessage;
module.exports.askPaymentMethod = askPaymentMethod;