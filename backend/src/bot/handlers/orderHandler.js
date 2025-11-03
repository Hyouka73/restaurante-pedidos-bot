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
  CONFIRMING_PHONE: 'confirming_phone', // Nuevo estado
  SELECTING_PAYMENT: 'selecting_payment', 
  FINAL_CONFIRMATION: 'final_confirmation'
};

const mainOrderHandler = async (ctx) => {
  try {
    // 🔥 AÑADIDO: Mostrar "escribiendo..." para dar feedback al usuario
    await ctx.replyWithChatAction('typing');

    console.log('🛒 [orderHandler] Iniciando...');
    
    const userId = ctx.from.id;
    // 🔥 MODIFICADO: Obtener y almacenar restaurantId en ctx.state
    if (!ctx.state.restaurantId) {
      console.log('🔍 [orderHandler] Buscando restaurantId...');
      ctx.state.restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
    }
    const restaurantId = ctx.state.restaurantId; // Leer desde ctx.state

    if (!restaurantId) {
      console.log('❌ [orderHandler] No se pudo identificar restaurante desde ctx.state');
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

    // === MANEJO DE TEXTO Y CONTACTO ===
    // Si es un mensaje de texto (no comando) O un mensaje de contacto, lo procesamos.
    if (ctx.message && ((ctx.message.text && !ctx.message.text.startsWith('/')) || ctx.message.contact)) {
      console.log('📝 [orderHandler] Procesando mensaje de texto o contacto...');
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
  await ctx.reply('📍 Ubicación recibida, calculando costo de envío...', {
    reply_markup: { remove_keyboard: true }
  });

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

    // --- 🔥 MEJORA DE TELÉFONO INTELIGENTE ---
    // En lugar de ir directo a WAITING_PHONE, llamamos a la función inteligente
    const userInfo = await telegramUserService.getUserInfo(userId);
    await askForPhone(ctx, session, userInfo, restaurantId);

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

  // 🔥 NUEVO: Verificar si es un mensaje de contacto
  if (ctx.message.contact) {
    console.log('📞 [handleTextMessage] Procesando mensaje de contacto...');
    if (ctx.message.contact.user_id !== userId) {
      // Opcional: Verificar que el contacto sea del usuario que envía el mensaje
      console.log('📞 [handleTextMessage] Contacto no coincide con el usuario actual.');
      await ctx.reply('Por favor, comparte tu propio número de teléfono.');
      return;
    }
    const contactPhone = ctx.message.contact.phone_number;
    if (contactPhone) {
      await ctx.reply(`📞 ¡Número de contacto recibido!`, { reply_markup: { remove_keyboard: true } });
      session.customerPhone = contactPhone;
      await askForPhone(ctx, session, { id: userId }, restaurantId, false); // Iniciar confirmación
    } else {
      await ctx.reply('No se pudo extraer el número de teléfono del contacto. Por favor, ingrésalo manualmente.');
      const userInfo = await telegramUserService.getUserInfo(userId);
      await askForPhone(ctx, session, userInfo, restaurantId);
    }
    return;
  }
  // 🔥 FIN NUEVO

  const text = ctx.message.text?.trim();
  console.log(`📝 [handleTextMessage] Estado: ${session.step}, Texto: "${text?.substring(0, 50)}"`);

  switch (session.step) {
    case SESSION_STATES.WAITING_PHONE:
      const phoneRegex = /^[\d\s\-\+\(\)]{8,}$/;
      if (!text || !phoneRegex.test(text)) {
        await ctx.reply('📞 Por favor proporciona un número de teléfono válido.');
        return;
      }
      session.customerPhone = text;
      console.log('✅ [handleTextMessage] Teléfono guardado');

      // 🔥 --- INICIO DE LA SOLUCIÓN (QUITAR MENSAJE) --- 🔥
      // Simplemente llama a la siguiente función.
      // askForPhone enviará la pregunta de confirmación.
      await askForPhone(ctx, session, { id: userId }, restaurantId, false);
      break;
    case SESSION_STATES.WAITING_ADDRESS:
      if (!text || text.length < 10) {
        await ctx.reply('📝 Por favor proporciona una dirección más completa (mínimo 10 caracteres).');
        return;
      }
      session.customerAddress = text;
      console.log('✅ [handleTextMessage] Dirección guardada');
      
      const userInfo = await telegramUserService.getUserInfo(userId);
      await askForPhone(ctx, session, userInfo, restaurantId);
      
      if (features.askForName && !session.customerName) {
        session.step = SESSION_STATES.WAITING_NAME;
        await ctx.reply('👤 Por último, ¿cuál es tu nombre completo?');
      } else {
        session.step = SESSION_STATES.SELECTING_PAYMENT;
        await askPaymentMethod(ctx, session, restaurantId);
      }
      break;
      
    case SESSION_STATES.WAITING_NAME:
      if (!text || text.length < 2) {
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
// 🔥 CAMBIO: Añadir "isEdit = false"
async function askPaymentMethod(ctx, session, restaurantId, isEdit = false) {
  console.log('💳 [askPaymentMethod] Mostrando métodos de pago...');
  
  const restaurantData = await configBotService.getRestaurantData(restaurantId);
  const paymentMethods = restaurantData.paymentMethods || [];
  const enabledMethods = paymentMethods.filter(pm => pm.enabled);
  
  if (enabledMethods.length === 0) {
    console.log('⚠️ [askPaymentMethod] No hay métodos de pago configurados');
    const errorText = '⚠️ No hay métodos de pago configurados. Por favor contacta al restaurante.';
    if (isEdit) {
      await ctx.editMessageText(errorText, { reply_markup: { inline_keyboard: [] } });
    } else {
      await ctx.reply(errorText);
    }
    return;
  }

  const buttons = enabledMethods.map(pm =>
    [Markup.button.callback(`💳 ${pm.name}`, `payment_${pm.id}`)]
  );
  
  console.log(`✅ [askPaymentMethod] Mostrando ${enabledMethods.length} métodos de pago`);
  
  // 🔥 CAMBIO: Añadir lógica de edición
  const text = '💳 *Selecciona tu método de pago:*';
  const options = {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
  };

  if (isEdit) {
    // 🔥--- INICIO DE LA SOLUCIÓN ---🔥
    try {
      await ctx.editMessageText(text, options);
    } catch (error) {
      // Si el error es "message is not modified", es por un doble clic.
      // Lo ignoramos para que no crashee.
      if (error.description && error.description.includes('message is not modified')) {
        console.warn('[askPaymentMethod] Ignorando error "message is not modified" (doble clic).');
        // Importante: responde al callback para que el "loading" del usuario desaparezca.
        await ctx.answerCbQuery().catch(console.error);
      } else {
        // Si fue otro error, sí lo lanzamos.
        throw error;
      }
    }
  } else {
    await ctx.reply(text, options);
  }
}

// --- 🔥 NUEVA FUNCIÓN "INTELIGENTE" PARA PEDIR TELÉFONO ---
async function askForPhone(ctx, session, userInfo, restaurantId, isEdit = false) {
  const restaurantData = await configBotService.getRestaurantData(restaurantId);
  const features = restaurantData.features || {};

  // Si la función de pedir teléfono está desactivada, saltar a pago
  if (!features.askForPhone) {
    console.log('[askForPhone] La función askForPhone está desactivada. Saltando a pago.');
    session.step = SESSION_STATES.SELECTING_PAYMENT;
    await askPaymentMethod(ctx, session, restaurantId);
    return;
  }
  
  // Revisar si YA tenemos un número (de esta sesión o de la BD)
  const existingPhone = session.customerPhone || userInfo?.phone;

  if (existingPhone) {
    console.log(`[askForPhone] Teléfono encontrado: ${existingPhone}`);
    session.step = SESSION_STATES.CONFIRMING_PHONE;
    session.customerPhone = existingPhone; // Asegurarnos que está en la sesión
    
    const text = `📞 ¿Confirmas que usemos este número?\n*${existingPhone}*`;
    const options = {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.callback('👍 Sí, usar este', `confirm_phone_yes`),
          Markup.button.callback('✏️ No, usar otro', `confirm_phone_no`)
        ])
    };

    if (isEdit) {
      await ctx.editMessageText(text, options);
    } else {
      await ctx.reply(text, options);
    }

  } else {
    // No tenemos número, lo pedimos
    console.log('[askForPhone] No se encontró teléfono. Solicitando...');
    session.step = SESSION_STATES.WAITING_PHONE;
    const text = '📞 Por favor, comparte tu número de teléfono para confirmación.\n\nPuedes escribirlo o usar el botón de abajo.';
    const options = {
        parse_mode: 'Markdown',
        ...Markup.keyboard([
          [Markup.button.contactRequest('Compartir mi número 📱')]
        ]).oneTime().resize(),
        input_field_placeholder: 'Escribe tu número aquí...',
        reply_markup: { // Keep this for compatibility if needed, but the builder is preferred
          keyboard: [[Markup.button.contactRequest('Compartir mi número 📱')]],
          one_time_keyboard: true,
          resize_keyboard: true,
        }
    };
    if (isEdit) {
      await ctx.editMessageText(text, options);
    } else {
      await ctx.reply(text, options);
    }
  }
}

// Exportar
module.exports = mainOrderHandler;
module.exports.SESSION_STATES = SESSION_STATES;
module.exports.handleLocationMessage = handleLocationMessage;
module.exports.handleTextMessage = handleTextMessage;
module.exports.askPaymentMethod = askPaymentMethod;
module.exports.askForPhone = askForPhone; // 🔥 Exportamos la nueva función