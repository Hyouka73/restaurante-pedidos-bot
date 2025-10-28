// backend/src/bot/handlers/cartHandler.js

const { Markup } = require('telegraf');
const { userOrderSessions, SESSION_STATES, askPaymentMethod } = require('./orderHandler');
const menuService = require('../../services/menuService');
const configBotService = require('../../services/configBotService');
const DiscountRuleService = require('../../services/discountRuleService');
const orderService = require('../../services/orderService');

// --- LÓGICA DE AÑADIR ITEM ---
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

  // --- LÓGICA DE COMBOS DINÁMICOS ---
  const { cart: updatedCart, notification: comboNotification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
  userOrderSessions.set(userId, updatedCart); 

  if (comboNotification) {
    await ctx.reply(`*${comboNotification.titulo}*\n${comboNotification.texto}`, { parse_mode: 'Markdown' });
  }

  // --- LÓGICA DE VENTA CRUZADA (CROSS-SELL) ---
  if (item.sugerir_items && item.sugerir_items.length > 0) {
    const apiClient = require('../../services/apiClient'); // Asumimos que tienes este servicio
    try {
      const crossSellResponse = await apiClient.post('/chatbot/get-cross-sell', {
        restaurantId: restaurantId,
        item_agregado_id: itemId
      });
      const suggestions = crossSellResponse.data.sugerencias;
      if (suggestions && suggestions.length > 0) {
        const suggestionNames = suggestions.map(s => s.nombre).join(', ');
        await ctx.reply(`💡 Ya que llevas *${item.name}*, quizás te interese también: ${suggestionNames}.`, { parse_mode: 'Markdown' });
      }
    } catch (crossSellError) {
      console.error('Error al obtener sugerencias de cross-sell:', crossSellError);
    }
  }
}

// --- LÓGICA DE INFO DE ITEM ---
async function handleItemInfo(ctx, callbackData, restaurantId) {
  const itemId = callbackData.split('_')[2];
  const menuItems = await menuService.getMenuForBot(restaurantId);
  const item = menuItems.find(i => i.id === itemId);

  if (!item) {
    await ctx.answerCbQuery('😔 Platillo no encontrado', { show_alert: true });
    return;
  }
  
  const price = item.price || 0;
  const itemType = item.isCombo ? '🎁 Combo' : '🍽️ Platillo';
  const info = 
    `${itemType}: *${item.name}*\n\n` +
    `${item.description || 'Deliciosa opción'}\n\n` +
    `💰 Precio: $${price.toFixed(2)}\n` +
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

// --- LÓGICA DE VER CARRITO (CON CORRECCIONES) ---
async function handleViewCart(ctx, userId, session) {
  if (!session || session.items.length === 0) {
    await ctx.answerCbQuery('🛒 Tu carrito está vacío', { show_alert: true });
    return;
  }

  // Usar los totales de la sesión (calculados por DiscountRuleService)
  // Fallbacks (|| 0) por si la sesión es de una versión anterior
  const subtotal = session.subtotal || session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = session.discount; // Objeto { amount, ruleName }
  const total = session.total || subtotal;

  let cartMessage = '🛒 *Tu Carrito de Compras*\n';
  cartMessage += '─'.repeat(25) + '\n\n';
  
  session.items.forEach((item, index) => {
    const itemType = item.type === 'combo' ? '🎁' : '🍽️';
    cartMessage += `${itemType} *${item.name}*\n`;
    const price = item.price || 0;
    const itemTotal = (price * item.quantity);
    cartMessage += `   ${item.quantity} x $${price.toFixed(2)} = *$${itemTotal.toFixed(2)}*\n\n`;
  });
  
  cartMessage += '─'.repeat(25) + '\n';
  
  cartMessage += `💰 *Subtotal: $${subtotal.toFixed(2)}*\n`;

  // Mostrar descuento si existe
  if (discount && discount.amount > 0) {
    cartMessage += `🎉 *Promo "${discount.ruleName}": -$${discount.amount.toFixed(2)}*\n`;
  }
  
  cartMessage += `*TOTAL: $${total.toFixed(2)}*`;

  const buttons = [];
  session.items.forEach((item, index) => {
    buttons.push([Markup.button.callback(`- ${item.name} -`, `item_info_${item.id}`)]);
    buttons.push([
      Markup.button.callback('➖', `qty_decrease_${index}`),
      Markup.button.callback(`${item.quantity}x`, 'no_action'),
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

// --- LÓGICA DE CAMBIAR CANTIDAD (CON CORRECCIONES) ---
async function handleQuantityChange(ctx, callbackData, userId, session, restaurantId) {
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

  // Recalcular descuentos dinámicos
  const { cart: updatedCart, notification: comboNotification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
  userOrderSessions.set(userId, updatedCart); // Guardar el carrito actualizado

  // Notificar al usuario SI HAY un cambio en el descuento
  if (comboNotification) {
    await ctx.reply(`*${comboNotification.titulo}*\n${comboNotification.texto}`, { parse_mode: 'Markdown' });
  }

  // Actualizar la vista del carrito con el carrito actualizado
  await handleViewCart(ctx, userId, updatedCart);
}

// --- LÓGICA DE QUITAR ITEM (CON CORRECCIONES) ---
async function handleRemoveItem(ctx, callbackData, userId, session, restaurantId) {
  if (!session) return;

  const index = parseInt(callbackData.split('_')[1]);
  const item = session.items[index];
  if (!item) {
    await ctx.answerCbQuery('❌ Item no encontrado');
    return;
  }

  session.items.splice(index, 1);
  await ctx.answerCbQuery(`🗑️ ${item.name} eliminado del carrito`);

  // Recalcular descuentos dinámicos
  const { cart: updatedCart, notification: comboNotification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
  userOrderSessions.set(userId, updatedCart);

  // Notificar al usuario SI HAY un cambio en el descuento
  if (comboNotification) {
    await ctx.reply(`*${comboNotification.titulo}*\n${comboNotification.texto}`, { parse_mode: 'Markdown' });
  }

  if (updatedCart.items.length === 0) {
    await ctx.editMessageText('🛒 Tu carrito está vacío\n\n¿Deseas ver el menú nuevamente?', {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 Ver Menú', 'back_to_menu')],
        [Markup.button.callback('❌ Cancelar', 'cancel_order')]
      ])
    });
  } else {
    // Actualizar la vista del carrito con el carrito actualizado
    await handleViewCart(ctx, userId, updatedCart);
  }
}

// --- LÓGICA DE ENTREGA/RECOJO ---
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

// --- LÓGICA DE PEDIR UBICACIÓN ---
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

// --- LÓGICA DE RECOGER EN TIENDA ---
async function handlePickup(ctx, userId, session, restaurantId) {
  if (!session) return;

  const restaurantData = await configBotService.getRestaurantData(restaurantId);
  const features = restaurantData.features || {};

  session.deliveryType = 'pickup';
  session.delivery = { fee: 0, distanceKm: 0 }; // Reiniciar costos de envío
  // Recalcular total por si acaso
  const { cart: updatedCart } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
  userOrderSessions.set(userId, updatedCart);
  
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

// --- LÓGICA DE SELECCIÓN DE PAGO ---
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

// --- LÓGICA DE MOSTRAR RESUMEN FINAL ---
async function showFinalConfirmation(ctx, session, restaurantData) {
  // Usar los totales de la sesión
  const subtotal = session.subtotal || 0;
  const deliveryFee = session.delivery?.fee || 0;
  const discount = session.discount;
  const total = session.total || (subtotal + deliveryFee);

  let confirmMessage = '📋 *Resumen de tu Pedido:*\n\n';
  confirmMessage += '🛒 *Items:*\n';
  session.items.forEach((item, i) => {
    const itemTotal = (item.price || 0) * item.quantity;
    confirmMessage += `${i + 1}. ${item.name} (${item.quantity}x) - $${itemTotal.toFixed(2)}\n`;
  });
  confirmMessage += `\n💰 Subtotal: $${subtotal.toFixed(2)}\n`;
  
  if (session.deliveryType === 'delivery') {
    confirmMessage += `🚚 Envío: $${deliveryFee.toFixed(2)}\n`;
    if (deliveryFee === 0 && session.delivery?.distanceKm > 0) {
      confirmMessage += `   ✨ _¡Envío gratis!_\n`;
    }
  } else {
    confirmMessage += `🏪 Recoger en tienda: $0.00\n`;
  }
  
  // Mostrar descuento si existe
  if (discount && discount.amount > 0) {
    confirmMessage += `🎉 *Promo "${discount.ruleName}": -$${discount.amount.toFixed(2)}*\n`;
  }

  confirmMessage += `\n*TOTAL: $${total.toFixed(2)}*\n\n`;
  
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
      [Markup.button.callback('✏️ Editar', 'view_cart')], // Botón para volver al carrito
      [Markup.button.callback('❌ Cancelar', 'cancel_order')]
    ])
  });
}

// --- LÓGICA DE CONFIRMACIÓN FINAL (CREAR ORDEN) ---
async function handleFinalConfirmation(ctx, userId, session, restaurantId) {
  if (!session) return;
  
  // Evitar doble confirmación
  if (session.step !== SESSION_STATES.FINAL_CONFIRMATION) {
    await ctx.answerCbQuery('⚠️ Tu pedido ya está siendo procesado.');
    return;
  }
  
  session.step = 'PROCESSING'; // Marcar como procesando para evitar duplicados
  userOrderSessions.set(userId, session);

  await ctx.answerCbQuery('⏳ Procesando pedido...');
  try {
    // Usar los totales finales de la sesión
    const subtotal = session.subtotal || 0;
    const deliveryFee = session.delivery?.fee || 0;
    const total = session.total || (subtotal + deliveryFee);
    const discountAmount = session.discount?.amount || 0;
    
    const orderData = {
      info: {
        location: {
          coordinates: session.customerLocation || null,
          formatted_address: session.customerAddress || null
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
      discount: discountAmount, // Guardar el monto del descuento
      total,
      deliveryType: session.deliveryType,
      paymentMethod: session.paymentMethod?.id,
      channel: 'telegram',
      status: 'pending',
      notificationsEnabled: true
    };
    const order = await orderService.createOrder(restaurantId, orderData);

    // Limpiar sesión SOLO si la orden se crea exitosamente
    userOrderSessions.delete(userId);

    // Editar el mensaje de resumen para que no se pueda volver a presionar
    await ctx.editMessageText(
      `✅ *¡Pedido Confirmado!*\n\n` +
      `📝 Número de pedido: *#${order.orderNumber || order.id.substring(0, 8).toUpperCase()}*\n` +
      `💰 Total: *$${total.toFixed(2)}*\n` +
      `⏱️ Tiempo estimado: 25-35 min\n\n` +
      `📍 ${session.deliveryType === 'delivery' ? '🚚 Será entregado a domicilio' : '🏪 Puedes recogerlo en tienda'}\n\n` +
      `🔔 Te notificaremos cuando tu pedido esté listo`,
      {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true } // Quitar teclado de ubicación
      }
    );
    
    // Preguntar por notificaciones
    await ctx.reply(
        '¿Deseas recibir una notificación por cada cambio de estado de tu pedido?',
        Markup.inlineKeyboard([
            [Markup.button.callback('👍 Sí, notificarme', `notify_yes_${restaurantId}_${order.id}`)],
            [Markup.button.callback('👎 No, yo consultaré', `notify_no_${restaurantId}_${order.id}`)]
        ])
    );
  } catch (error) {
    console.error('Error creando pedido:', error);
    // Restaurar estado para reintentar
    session.step = SESSION_STATES.FINAL_CONFIRMATION;
    userOrderSessions.set(userId, session);
    
    await ctx.reply(
      '❌ Hubo un error al procesar tu pedido. Por favor intenta nuevamente o contacta al restaurante.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Reintentar', 'confirm_final')],
        [Markup.button.callback('❌ Cancelar', 'cancel_order')]
      ])
    );
  }
}

// --- LÓGICA DE CANCELAR ORDEN ---
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
    // Si falla la edición (mensaje antiguo), envía uno nuevo
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

// Exportar todas las funciones
module.exports = {
    handleAddItem,
    handleItemInfo,
    handleViewCart,
    handleQuantityChange,
    handleRemoveItem,
    handleContinueToDelivery,
    handleDeliveryYes,
    handlePickup,
    handlePaymentSelection,
    showFinalConfirmation,
    handleFinalConfirmation,
    handleCancelOrder
};