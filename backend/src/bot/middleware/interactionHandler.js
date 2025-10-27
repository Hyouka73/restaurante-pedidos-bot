// backend/src/bot/middleware/interactionHandler.js
const { db } = require('../../config/firebase');
const menuService = require('../../services/menuService');
const orderService = require('../../services/orderService');
const telegramUserService = require('../services/telegramUserService');
const configBotService = require('../services/configBotService');
const availabilityService = require('../../services/availabilityService');
const { Markup } = require('telegraf');
const { 
  userOrderSessions, 
  SESSION_STATES, 
  sendMenuWithPhotos,
  askPaymentMethod 
} = require('../handlers/orderHandler');
const { formatOrderStatus } = require('../handlers/myOrderHandler');
const { showMenuView } = require('../handlers/menuHandler');

const defaultCommands = [
    { command: 'start', description: 'Iniciar conversación' },
    { command: 'menu', description: 'Ver menú completo' },
    { command: 'pedido', description: 'Hacer un pedido' },
];

const commandsWithMyOrder = [
    ...defaultCommands,
    { command: 'mipedido', description: 'Ver estado de mi pedido' },
];

module.exports = async (ctx) => {
  if (!ctx.callbackQuery) return;

  const userId = ctx.from.id;
  const callbackData = ctx.callbackQuery.data;

  try {
    let session = userOrderSessions.get(userId);
    
    const restaurantId = session?.restaurantId || await telegramUserService.getRestaurantIdByBotContext(ctx);

    if (!restaurantId) {
      await ctx.answerCbQuery('⚠️ No se pudo identificar el restaurante. Usa /start primero.', { show_alert: true });
      return;
    }

    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const messages = restaurantData.messages || {};
    const features = restaurantData.features || {};

    if (features.botEnabled === false) {
      const disabledMessage = messages.botDisabled || 'El bot está temporalmente desactivado.';
      await ctx.answerCbQuery(disabledMessage, { show_alert: true });
      return;
    }

    const orderActions = ['add_item_', 'view_cart', 'confirm_items', 'delivery_', 'pickup', 'payment_', 'confirm_final'];
    const involvesOrder = orderActions.some(prefix => callbackData.startsWith(prefix));
    
    if (involvesOrder) {
      const availability = await availabilityService.checkAvailability(restaurantId);
      if (availability.status !== 'open') {
        await ctx.answerCbQuery('😔 Lo sentimos, ya no podemos aceptar pedidos. ' + (availability.reason || ''), { show_alert: true });
        return;
      }
    }

    if (callbackData === 'init_order') {
      await ctx.answerCbQuery('🛒 Iniciando pedido...');
      const orderHandler = require('../handlers/orderHandler');
      await orderHandler(ctx);
      return;
    }

    if (callbackData === 'show_menu') {
      await ctx.answerCbQuery();
      const menuHandler = require('../handlers/menuHandler');
      await menuHandler(ctx);
      return;
    }

    if (callbackData === 'show_info') {
      await ctx.answerCbQuery();
      const restaurantData = await configBotService.getRestaurantData(restaurantId);
      const info = restaurantData.info || {};
      
      let infoMessage = `ℹ️ *Información del Restaurante*\n\n`;
      infoMessage += `🏪 *${info.name || 'Restaurante'}*\n\n`;
      
      if (info.description) {
        infoMessage += `📝 ${info.description}\n\n`;
      }
      
      if (info.address) {
        infoMessage += `📍 *Dirección:*\n${info.address}\n\n`;
      }
      
      if (info.phone) {
        infoMessage += `📞 *Teléfono:* ${info.phone}\n\n`;
      }
      
      const hours = restaurantData.hours || {};
      infoMessage += `⏰ *Horarios:*\n`;
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      
      dayKeys.forEach((key, index) => {
        const dayHours = hours[key];
        if (dayHours) {
          if (dayHours.closed) {
            infoMessage += `   ${days[index]}: Cerrado\n`;
          } else {
            infoMessage += `   ${days[index]}: ${dayHours.open} - ${dayHours.close}\n`;
          }
        }
      });

      await ctx.reply(infoMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🛒 Hacer Pedido', 'init_order')],
          [Markup.button.callback('« Volver', 'back_to_start')]
        ])
      });
      return;
    }

    if (callbackData === 'back_to_start') {
      await ctx.answerCbQuery();
      const startHandler = require('../handlers/startHandler');
      await startHandler(ctx);
      return;
    }

    if (callbackData.startsWith('menu_page_')) {
      const page = parseInt(callbackData.split('_')[2], 10);
      // Llama a la vista de menú paginada, editando el mensaje actual
      await showMenuView(ctx, page, true);
      return;
    }

    if (callbackData.startsWith('notify_')) {
      await handleNotificationPreference(ctx, callbackData);
      return;
    }

    if (callbackData.startsWith('show_order_status_')) {
      await handleShowOrderStatus(ctx, callbackData);
      return;
    }

    if (callbackData.startsWith('add_item_')) {
      await handleAddItem(ctx, callbackData, userId, session, restaurantId);
      return;
    }

    if (callbackData.startsWith('item_info_')) {
      await handleItemInfo(ctx, callbackData, restaurantId);
      return;
    }

    if (callbackData === 'view_cart') {
      await handleViewCart(ctx, userId, session);
      return;
    }

    if (callbackData.startsWith('qty_')) {
      await handleQuantityChange(ctx, callbackData, userId, session);
      return;
    }

    if (callbackData.startsWith('remove_')) {
      await handleRemoveItem(ctx, callbackData, userId, session);
      return;
    }

    if (callbackData === 'continue_to_delivery') {
      await handleContinueToDelivery(ctx, userId, session, restaurantId);
      return;
    }

    if (callbackData === 'delivery_yes') {
      await handleDeliveryYes(ctx, userId, session);
      return;
    }

    if (callbackData === 'pickup' || callbackData === 'change_to_pickup') {
      await handlePickup(ctx, userId, session, restaurantId);
      return;
    }

    if (callbackData.startsWith('payment_')) {
      await handlePaymentSelection(ctx, callbackData, userId, session, restaurantId);
      return;
    }

    if (callbackData === 'confirm_final') {
      await handleFinalConfirmation(ctx, userId, session, restaurantId);
      return;
    }

    if (callbackData === 'cancel_order') {
      await handleCancelOrder(ctx, userId);
      return;
    }

    if (callbackData === 'back_to_menu') {
      await showMenuView(ctx, 1, true); // EDIT: Replaced old function with new view
      return;
    }

    console.warn(`⚠️ Callback no manejado: ${callbackData}`);
    await ctx.answerCbQuery('⚠️ Acción no reconocida');

  } catch (error) {
    console.error('Error en interactionHandler:', error);
    await ctx.answerCbQuery('❌ Hubo un error al procesar tu selección.');
    
    try {
      await ctx.reply(
        '❌ Ocurrió un error inesperado.\n\n' +
        'Por favor intenta nuevamente o usa /start para reiniciar.'
      );
    } catch (replyError) {
      console.error('Error enviando mensaje de error:', replyError);
    }
  }
};

// === HANDLERS INDIVIDUALES ===

async function handleAddItem(ctx, callbackData, userId, session, restaurantId) {
  if (!session) {
    await ctx.answerCbQuery('⚠️ Tu sesión ha expirado. Inicia un nuevo pedido con /pedido', { show_alert: true });
    return;
  }

  const itemId = callbackData.split('_')[2];
  const menuData = await menuService.getMenuForBot(restaurantId);
  
  if (!Array.isArray(menuData)) {
    console.error('[handleAddItem] menuData no es array:', typeof menuData, menuData);
    await ctx.answerCbQuery('❌ Error al cargar el menú', { show_alert: true });
    return;
  }
  
  const item = menuData.find(i => i.id === itemId);

  if (!item || item.available === false) {
    await ctx.answerCbQuery('😔 Este platillo ya no está disponible.', { show_alert: true });
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
    await ctx.answerCbQuery(`✅ ${item.name} agregado al carrito`);
  }

  userOrderSessions.set(userId, session);
}

async function handleItemInfo(ctx, callbackData, restaurantId) {
  const itemId = callbackData.split('_')[2];
  const menuItems = await menuService.getMenuForBot(restaurantId);
  const item = menuItems.find(i => i.id === itemId);

  if (!item) {
    await ctx.answerCbQuery('😔 Platillo no encontrado', { show_alert: true });
    return;
  }

  const itemType = item.isCombo ? '🎁 Combo' : '🍽️ Platillo';
  
  const info = 
    `${itemType}: *${item.name}*\n\n` +
    `${item.description || 'Deliciosa opción'}\n\n` +
    `💰 Precio: ${item.price}\n` +
    `⏱️ Tiempo de preparación: ${item.prepTime || '20-30'} min\n` +
    `${item.ingredients ? `\n🥘 Ingredientes: ${item.ingredients}` : ''}`;

  await ctx.answerCbQuery();
  await ctx.reply(info, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🛒 Agregar al pedido', `add_item_${item.id}`)],
      [Markup.button.callback('« Volver', 'back_to_menu')]
    ])
  });
}

async function handleViewCart(ctx, userId, session) {
  if (!session || session.items.length === 0) {
    await ctx.answerCbQuery('🛒 Tu carrito está vacío', { show_alert: true });
    return;
  }

  const subtotal = session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let cartMessage = '🛒 *Tu Carrito de Compras*\n';
  cartMessage += '─'.repeat(25) + '\n\n';

  session.items.forEach((item, index) => {
    const itemType = item.type === 'combo' ? '🎁' : '🍽️';
    cartMessage += `${itemType} *${item.name}*\n`;
    cartMessage += `   ${item.quantity} x ${item.price} = *${item.price * item.quantity}*\n\n`;
  });
  cartMessage += '─'.repeat(25) + '\n';
  cartMessage += `💰 *Subtotal: ${subtotal}*`;

  const buttons = [];
  
  session.items.forEach((item, index) => {
    // Fila 1: Nombre del item (puede ser un botón informativo)
    buttons.push([Markup.button.callback(`- ${item.name} -`, `item_info_${item.id}`)]);
    // Fila 2: Controles de cantidad y eliminación
    buttons.push([
      Markup.button.callback('➖', `qty_decrease_${index}`),
      Markup.button.callback(`${item.quantity}x`, 'no_action'), // Indicador de cantidad no clickeable
      Markup.button.callback('➕', `qty_increase_${index}`),
      Markup.button.callback('🗑️ Eliminar', `remove_${index}`)
    ]);
  });

  buttons.push([Markup.button.callback('➕ Agregar más platillos', 'back_to_menu')]);
  buttons.push([
    Markup.button.callback('✅ Continuar al Pago', 'continue_to_delivery'),
    Markup.button.callback('❌ Vaciar Carrito', 'cancel_order')
  ]);

  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText(cartMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch (e) {
    // Si falla la edición (ej. mensaje muy antiguo), envía uno nuevo.
    await ctx.reply(cartMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }
}

async function handleQuantityChange(ctx, callbackData, userId, session) {
  if (!session) return;

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
      await ctx.answerCbQuery('⚠️ Usa el botón 🗑️ para eliminar');
      return;
    }
  }

  userOrderSessions.set(userId, session);
  await handleViewCart(ctx, userId, session);
}

async function handleRemoveItem(ctx, callbackData, userId, session) {
  if (!session) return;

  const index = parseInt(callbackData.split('_')[1]);
  const item = session.items[index];

  if (!item) {
    await ctx.answerCbQuery('❌ Item no encontrado');
    return;
  }

  session.items.splice(index, 1);
  userOrderSessions.set(userId, session);

  await ctx.answerCbQuery(`🗑️ ${item.name} eliminado del carrito`);
  
  if (session.items.length === 0) {
    await ctx.editMessageText('🛒 Tu carrito está vacío\n\n¿Deseas ver el menú nuevamente?', {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 Ver Menú', 'back_to_menu')],
        [Markup.button.callback('❌ Cancelar', 'cancel_order')]
      ])
    });
  } else {
    await handleViewCart(ctx, userId, session);
  }
}

async function handleContinueToDelivery(ctx, userId, session, restaurantId) {
  if (!session) return;

  const restaurantData = await configBotService.getRestaurantData(restaurantId);
  const features = restaurantData.features || {};
  const delivery = restaurantData.delivery || {};

  const buttons = [];
  
  if (features.deliveryEnabled && delivery.enabled) {
    buttons.push([Markup.button.callback('🏠 A Domicilio', 'delivery_yes')]);
  }
  
  if (features.pickupEnabled) {
    buttons.push([Markup.button.callback('🏪 Recoger en Tienda', 'pickup')]);
  }

  if (buttons.length === 0) {
    await ctx.answerCbQuery('⚠️ No hay métodos de entrega disponibles', { show_alert: true });
    return;
  }

  buttons.push([Markup.button.callback('« Volver al carrito', 'view_cart')]);

  session.step = SESSION_STATES.CHOOSING_DELIVERY;
  userOrderSessions.set(userId, session);

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '🚀 *¿Cómo deseas recibir tu pedido?*\n\n' +
    `🏠 *A Domicilio:* Entrega en tu ubicación\n` +
    `🏪 *Recoger en Tienda:* Sin costo de envío`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
}

async function handleDeliveryYes(ctx, userId, session) {
  if (!session) return;

  session.deliveryType = 'delivery';
  session.step = SESSION_STATES.WAITING_LOCATION;
  userOrderSessions.set(userId, session);

  await ctx.answerCbQuery();
  await ctx.reply(
    '📍 *Por favor, comparte tu ubicación*\n\n' +
    '👉 Presiona el botón 📎 y selecciona "Ubicación"\n' +
    'o usa el botón de abajo:',
    {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        [Markup.button.locationRequest('📍 Compartir mi ubicación')]
      ]).resize()
    }
  );

  await ctx.reply(
    '💡 _También puedes presionar el ícono de clip (📎) en tu teclado y seleccionar "Ubicación"_',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🏪 Cambiar a Recoger', 'change_to_pickup')],
        [Markup.button.callback('❌ Cancelar', 'cancel_order')]
      ])
    }
  );
}

async function handlePickup(ctx, userId, session, restaurantId) {
  if (!session) return;

  const restaurantData = await configBotService.getRestaurantData(restaurantId);
  const features = restaurantData.features || {};

  session.deliveryType = 'pickup';
  session.delivery = { fee: 0, distanceKm: 0 };
  userOrderSessions.set(userId, session);

  await ctx.answerCbQuery('✅ Recogerás tu pedido en tienda');

  await ctx.reply('🏪 Perfecto, recogerás tu pedido en tienda', {
    reply_markup: { remove_keyboard: true }
  });

  const address = restaurantData.info?.address || 'Dirección no disponible';
  await ctx.reply(
    `📍 *Dirección del restaurante:*\n${address}\n\n` +
    `⏱️ Tu pedido estará listo en aproximadamente 20-30 minutos`,
    { parse_mode: 'Markdown' }
  );

  if (features.askForPhone) {
    session.step = SESSION_STATES.WAITING_PHONE;
    await ctx.reply('📞 Por favor, escribe tu número de teléfono para confirmación:');
  } else {
    session.step = SESSION_STATES.SELECTING_PAYMENT;
    await askPaymentMethod(ctx, session, restaurantId);
  }
}

async function handlePaymentSelection(ctx, callbackData, userId, session, restaurantId) {
  if (!session) return;

  const paymentId = callbackData.split('_')[1];
  const restaurantData = await configBotService.getRestaurantData(restaurantId);
  const paymentMethods = restaurantData.paymentMethods || [];
  const selectedPayment = paymentMethods.find(pm => pm.id === paymentId);

  if (!selectedPayment) {
    await ctx.answerCbQuery('❌ Método de pago no válido');
    return;
  }

  session.paymentMethod = selectedPayment;
  session.step = SESSION_STATES.FINAL_CONFIRMATION;
  userOrderSessions.set(userId, session);

  await ctx.answerCbQuery(`✅ Pagarás con ${selectedPayment.name}`);
  await showFinalConfirmation(ctx, session, restaurantData);
}

async function showFinalConfirmation(ctx, session, restaurantData) {
  const subtotal = session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = session.delivery?.fee || 0;
  const total = subtotal + deliveryFee;

  let confirmMessage = '📋 *Resumen de tu Pedido:*\n\n';
  
  confirmMessage += '🛒 *Items:*\n';
  session.items.forEach((item, i) => {
    confirmMessage += `${i + 1}. ${item.name} (${item.quantity}x) - ${item.price * item.quantity}\n`;
  });
  
  confirmMessage += `\n💰 Subtotal: ${subtotal}\n`;
  
  if (session.deliveryType === 'delivery') {
    confirmMessage += `🚚 Envío: ${deliveryFee}\n`;
    if (deliveryFee === 0 && session.delivery?.distanceKm > 0) {
      confirmMessage += `   ✨ _¡Envío gratis!_\n`;
    }
  } else {
    confirmMessage += `🏪 Recoger en tienda: $0\n`;
  }
  
  confirmMessage += `\n*TOTAL: ${total}*\n\n`;
  
  confirmMessage += `📍 *Entrega:* ${session.deliveryType === 'delivery' ? 'A domicilio' : 'Recoger en tienda'}\n`;
  
  if (session.customerAddress) {
    confirmMessage += `📮 Dirección: ${session.customerAddress}\n`;
  }
  
  if (session.customerPhone) {
    confirmMessage += `📞 Teléfono: ${session.customerPhone}\n`;
  }
  
  confirmMessage += `💳 *Pago:* ${session.paymentMethod?.name || 'No seleccionado'}\n`;
  confirmMessage += `👤 *Nombre:* ${session.customerName || 'No proporcionado'}\n`;
  
  confirmMessage += `\n⏱️ *Tiempo estimado:* 25-35 minutos`;

  await ctx.reply(confirmMessage, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('✅ Confirmar Pedido', 'confirm_final')],
      [Markup.button.callback('✏️ Editar', 'view_cart')],
      [Markup.button.callback('❌ Cancelar', 'cancel_order')]
    ])
  });
}

async function handleFinalConfirmation(ctx, userId, session, restaurantId) {
  if (!session) return;

  await ctx.answerCbQuery('⏳ Procesando pedido...');

  try {
    const subtotal = session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = session.delivery?.fee || 0;
    const total = subtotal + deliveryFee;

    const orderData = {
      info: {
        location: {
          coordinates: session.customerLocation,
          formatted_address: session.customerAddress
        }
      },
      customer: {
        name: session.customerName,
        telegramId: userId,
        phone: session.customerPhone,
      },
      items: session.items,
      subtotal,
      deliveryFee,
      total,
      deliveryType: session.deliveryType,
      paymentMethod: session.paymentMethod?.id,
      channel: 'telegram',
      status: 'pending',
      notificationsEnabled: true
    };

    const order = await orderService.createOrder(restaurantId, orderData);

    userOrderSessions.delete(userId);

    await ctx.reply(
      `✅ *¡Pedido Confirmado!*\n\n` +
      `📝 Número de pedido: *#${order.orderNumber || order.id.substring(0, 8).toUpperCase()}*\n` +
      `💰 Total: *${total}*\n` +
      `⏱️ Tiempo estimado: 25-35 min\n\n` +
      `📍 ${session.deliveryType === 'delivery' ? '🚚 Será entregado a domicilio' : '🏪 Puedes recogerlo en tienda'}\n\n` +
      `🔔 Te notificaremos cuando tu pedido esté listo`,
      {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true }
      }
    );

    await ctx.reply(
        '¿Deseas recibir una notificación por cada cambio de estado de tu pedido?',
        Markup.inlineKeyboard([
            [Markup.button.callback('👍 Sí, notificarme', `notify_yes_${restaurantId}_${order.id}`)],
            [Markup.button.callback('👎 No, yo consultaré', `notify_no_${restaurantId}_${order.id}`)]
        ])
    );

  } catch (error) {
    console.error('Error creando pedido:', error);
    await ctx.reply(
      '❌ Hubo un error al procesar tu pedido. Por favor intenta nuevamente o contacta al restaurante.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Reintentar', 'confirm_final')],
        [Markup.button.callback('❌ Cancelar', 'cancel_order')]
      ])
    );
  }
}

async function handleCancelOrder(ctx, userId) {
  userOrderSessions.delete(userId);
  await ctx.answerCbQuery('❌ Pedido cancelado');
  
  try {
    await ctx.editMessageText(
      '❌ Pedido cancelado\n\n¿Deseas iniciar un nuevo pedido?',
      {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🛒 Nuevo Pedido', 'init_order')],
          [Markup.button.callback('📋 Ver Menú', 'show_menu')]
        ])
      }
    );
  } catch (editError) {
    await ctx.reply(
      '❌ Pedido cancelado\n\n¿Deseas iniciar un nuevo pedido?',
      {
        reply_markup: { remove_keyboard: true },
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🛒 Nuevo Pedido', 'init_order')],
          [Markup.button.callback('📋 Ver Menú', 'show_menu')]
        ])
      }
    );
  }
}

async function handleNotificationPreference(ctx, callbackData) {
  const [, choice, restaurantId, orderId] = callbackData.split('_');
  const userId = ctx.from.id;
  
  await ctx.answerCbQuery();

  try {
    if (choice === 'yes') {
      await ctx.telegram.setMyCommands(defaultCommands, { scope: { type: 'chat', chat_id: userId } });
      await ctx.editMessageText('✅ ¡Perfecto! Te mantendremos informado sobre tu pedido.', { reply_markup: null });
    } else if (choice === 'no') {
      const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId);
      await orderRef.update({ notificationsEnabled: false });
      
      await ctx.telegram.setMyCommands(commandsWithMyOrder, { scope: { type: 'chat', chat_id: userId } });

      await ctx.editMessageText('👍 Entendido. No te enviaremos notificaciones automáticas.', { reply_markup: null });
      await ctx.reply('Puedes consultar el estado de tu pedido en cualquier momento con el comando /mipedido.');
    }
  } catch (error) {
    console.error('Error updating notification preference:', error);
    await ctx.reply('❌ Hubo un error al guardar tu preferencia.');
  }
}

async function handleShowOrderStatus(ctx, callbackData) {
    const [, , restaurantId, orderId] = callbackData.split('_');
    await ctx.answerCbQuery();

    try {
        const order = await orderService.getOrder(restaurantId, orderId);
        const statusMessage = formatOrderStatus(order);
        await ctx.editMessageText(statusMessage, { parse_mode: 'Markdown', reply_markup: null });
    } catch (error) {
        console.error('Error showing order status:', error);
        await ctx.reply('❌ Hubo un error al consultar el estado de tu pedido.');
    }
}