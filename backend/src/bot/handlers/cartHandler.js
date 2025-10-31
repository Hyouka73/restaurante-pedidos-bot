// Importaciones necesarias (algunas son de tu viejo cartHandler)
const { Markup } = require('telegraf');
const menuService = require('../../services/menuService');
const configBotService = require('../services/configBotService');
const DiscountRuleService = require('../../services/discountRuleService');
const { SESSION_STATES, askPaymentMethod } = require('./orderHandler');
const { showMenuView } = require('./menuHandler'); // Para 'back_to_menu'

// --- LÓGICA DE AÑADIR ITEM ---
// ✅ LÓGICA MEJORADA: Inicia el pedido si no existe
async function handleAddItem(ctx, callbackData, userId, restaurantId) {
  // Si no hay carrito, se crea uno nuevo automáticamente.
  if (!ctx.session?.cart) {
    console.log('🛒 [handleAddItem] No hay carrito, creando uno nuevo...');
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
  }
  const session = ctx.session.cart;
  
  const itemId = callbackData.split('_')[2];
  const menuData = await menuService.getMenuForBot(restaurantId);
  if (!Array.isArray(menuData)) {
    console.error('[handleAddItem] menuData no es array:', typeof menuData);
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

  // Aplicar combos dinámicos
  const { cart: updatedCart, notification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
  ctx.session.cart = updatedCart;

  if (notification) {
    await ctx.reply(`*${notification.title}*\n${notification.text}`, { parse_mode: 'Markdown' });
  }

  // Cross-sell (Lógica mejorada de interactionHandler)
  if (item.sugerir_items && item.sugerir_items.length > 0) {
    try {
      const suggestionPromises = item.sugerir_items.map(itemId => 
        menuService.getMenuItem(restaurantId, itemId)
      );
      const rawSuggestions = await Promise.all(suggestionPromises);
      const suggestions = rawSuggestions.filter(s => s);
      if (suggestions && suggestions.length > 0) {
        const suggestionNames = suggestions.map(s => s.name).join(', ');
        await ctx.reply(`💡 Ya que llevas *${item.name}*, quizás te interese también: ${suggestionNames}.`, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      console.error('Error en cross-sell:', error);
    }
  }
}

// --- LÓGICA DE INFO DE ITEM ---
// 
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
    `💰 Precio: $${item.price}\n` + // Asumimos que el precio ya viene formateado o es un número
    `⏱️ Tiempo de preparación: ${item.prepTime || '20-30'} min\n` +
    `${item.ingredients ? `\n🥘 Ingredientes: ${item.ingredients}` : ''}`;

  await ctx.answerCbQuery();
  await ctx.reply(info, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🛒 Agregar al pedido', `add_item_${item.id}`)],
      [Markup.button.callback('« Volver', 'back_to_menu')] // 'back_to_menu' es manejado por interactionHandler
    ])
  });
}

// --- LÓGICA DE VER CARRITO ---
// 
async function handleViewCart(ctx, userId) {
  const session = ctx.session?.cart;
  if (!session || session.items.length === 0) {
    await ctx.answerCbQuery('🛒 Tu carrito está vacío', { show_alert: true });
    return;
  }
  
  // Usar los totales de la sesión (calculados por DiscountRuleService)
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
    await ctx.reply(cartMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }
}

// --- LÓGICA DE CAMBIAR CANTIDAD ---
// (Modificada para usar la nueva lógica de 'applyDynamicCombos')
async function handleQuantityChange(ctx, callbackData, userId, restaurantId) {
  const session = ctx.session?.cart;
  if (!session) {
    await ctx.answerCbQuery('⚠️ Sesión expirada');
    return;
  }

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
  const { cart: updatedCart, notification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
  ctx.session.cart = updatedCart; // Guardar el carrito actualizado

  // Notificar al usuario SI HAY un cambio en el descuento
  if (notification) {
    await ctx.reply(`*${notification.title}*\n${notification.text}`, { parse_mode: 'Markdown' });
  }

  // Actualizar la vista del carrito
  await handleViewCart(ctx, userId);
}

// --- LÓGICA DE QUITAR ITEM ---
// (Modificada para usar la nueva lógica de 'applyDynamicCombos')
async function handleRemoveItem(ctx, callbackData, userId, restaurantId) {
  const session = ctx.session?.cart;
  if (!session) {
    await ctx.answerCbQuery('⚠️ Sesión expirada');
    return;
  }

  const index = parseInt(callbackData.split('_')[1]);
  const item = session.items[index];

  if (!item) {
    await ctx.answerCbQuery('❌ Item no encontrado');
    return;
  }
  
  const removedItemName = item.name;
  session.items.splice(index, 1);
  await ctx.answerCbQuery(`🗑️ ${removedItemName} eliminado del carrito`);

  // Recalcular descuentos dinámicos
  const { cart: updatedCart, notification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
  ctx.session.cart = updatedCart;

  // Notificar al usuario SI HAY un cambio en el descuento
  if (notification) {
    await ctx.reply(`*${notification.title}*\n${notification.text}`, { parse_mode: 'Markdown' });
  }
  
  if (session.items.length === 0) {
    await ctx.editMessageText('🛒 Tu carrito está vacío\n\n¿Deseas ver el menú nuevamente?', {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('📋 Ver Menú', 'back_to_menu')],
        [Markup.button.callback('❌ Cancelar', 'cancel_order')]
      ])
    });
  } else {
    await handleViewCart(ctx, userId);
  }
}

// --- LÓGICA DE ENTREGA/RECOJO ---
// 
async function handleContinueToDelivery(ctx, userId, restaurantId) {
  const session = ctx.session?.cart;
  if (!session) {
    await ctx.answerCbQuery('⚠️ Sesión expirada');
    return;
  }

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
// 
async function handleDeliveryYes(ctx, userId) {
  const session = ctx.session?.cart;
  if (!session) {
    await ctx.answerCbQuery('⚠️ Sesión expirada');
    return;
  }

  session.deliveryType = 'delivery';
  session.step = SESSION_STATES.WAITING_LOCATION;

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
// (Modificada para usar la nueva lógica de 'applyDynamicCombos')
async function handlePickup(ctx, userId, restaurantId) {
  const session = ctx.session?.cart;
  if (!session) {
    await ctx.answerCbQuery('⚠️ Sesión expirada');
    return;
  }

  const restaurantData = await configBotService.getRestaurantData(restaurantId);
  const features = restaurantData.features || {};

  session.deliveryType = 'pickup';
  session.delivery = { fee: 0, distanceKm: 0 }; // Reiniciar costos de envío

  // Recalcular total (por si había un costo de envío)
  const { cart: updatedCart } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
  ctx.session.cart = updatedCart;
  
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
// 
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
    await ctx.answerCbQuery('❌ Método de pago no válido');
    return;
  }

  session.paymentMethod = selectedPayment;
  session.step = SESSION_STATES.FINAL_CONFIRMATION;

  await ctx.answerCbQuery(`✅ Pagarás con ${selectedPayment.name}`);
  
  // Pasamos ctx y restaurantId (que contiene los datos)
  await showFinalConfirmation(ctx, restaurantData);
}

// --- LÓGICA DE MOSTRAR RESUMEN FINAL ---
// (Modificada para usar los totales de la sesión)
async function showFinalConfirmation(ctx, restaurantData) {
  const session = ctx.session?.cart;
  if (!session) {
    await ctx.reply('⚠️ Sesión expirada. Inicia un nuevo pedido con /pedido');
    return;
  }

  // Usar los totales de la sesión
  const subtotal = session.subtotal || 0;
  const deliveryFee = session.delivery?.fee || 0;
  const discount = session.discount;
  const total = session.total || (subtotal + deliveryFee); // Total ya incluye descuento

  let confirmMessage = '📋 *Resumen de tu Pedido:*\n\n';
  confirmMessage += '🛒 *Items:*\n';
  session.items.forEach((item, i) => {
    confirmMessage += `${i + 1}. ${item.name} (${item.quantity}x) - $${((item.price || 0) * item.quantity).toFixed(2)}\n`;
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
// (Modificada para usar los totales de la sesión)
async function handleFinalConfirmation(ctx, userId, restaurantId) {
  const session = ctx.session?.cart;
  if (!session) {
    await ctx.answerCbQuery('⚠️ Sesión expirada');
    return;
  }
  
  // Evitar doble confirmación
  if (session.step === 'PROCESSING') {
     await ctx.answerCbQuery('⚠️ Tu pedido ya está siendo procesado.');
     return;
  }
  
  session.step = 'PROCESSING'; // Marcar como procesando
  
  await ctx.answerCbQuery('⏳ Procesando pedido...');
  
  try {
    // Usar los totales finales de la sesión
    const subtotal = session.subtotal || 0;
    const deliveryFee = session.delivery?.fee || 0;
    const total = session.total || (subtotal + deliveryFee);
    const discountAmount = session.discount?.amount || 0;
    
    const orderService = require('../../services/orderService'); // Evitar dependencia circular
    
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
        phone: session.customerPhone 
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

    // Limpiar sesión
    delete ctx.session.cart;
    
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
        reply_markup: { inline_keyboard: [] } // ✅ CORRECCIÓN: Borra los botones del mensaje
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
    console.error('❌ Error creando pedido:', error);
    
    // Restaurar estado para reintentar
    session.step = SESSION_STATES.FINAL_CONFIRMATION;
    
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
// 
async function handleCancelOrder(ctx, userId) {
  delete ctx.session.cart;
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
        // ✅ CORRECCIÓN: Se elimina el 'remove_keyboard' que causaba conflicto
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