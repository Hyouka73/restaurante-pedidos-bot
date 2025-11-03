// Importaciones necesarias (algunas son de tu viejo cartHandler)
const { Markup } = require('telegraf');
const { db } = require('../../config/firebase'); // 🔥 AÑADIDO: Para actualizar la orden directamente
const menuService = require('../../services/menuService');
const configBotService = require('../services/configBotService');
const DiscountRuleService = require('../../services/discountRuleService');
const availabilityService = require('../../services/availabilityService');
// 🔥 CORRECCIÓN: Importamos 'askForPhone' y 'telegramUserService' que faltaban
const { SESSION_STATES, askPaymentMethod, askForPhone } = require('./orderHandler');
const { showMenuView, showItemInfo } = require('./menuHandler'); // 🔥 Importar showItemInfo
const telegramUserService = require('../services/telegramUserService');

// --- AÑADIR ITEM ---
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
    await ctx.answerCbQuery('❌ Error al cargar menú', { show_alert: true });
    return;
  }
  
  const item = menuData.find(i => i.id === itemId);
  if (!item || item.available === false) {
    await ctx.answerCbQuery('😔 Platillo no disponible', { show_alert: true });
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
    await ctx.answerCbQuery(`✅ ${item.name} añadido`);
  }

  const { cart: updatedCart, notification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
  ctx.session.cart = updatedCart;

  // Solo enviar si la notificación y su título existen
  if (notification && notification.title) {
    await ctx.reply(`*${notification.title}*\n${notification.text}`, { parse_mode: 'Markdown' });
  }

  // 🔥 EDITAR el mensaje actual para mostrar el carrito actualizado
  await handleViewCart(ctx, userId);
}

// --- INFO DE ITEM (ahora edita el mensaje) ---
async function handleItemInfo(ctx, callbackData, restaurantId) {
  const itemId = callbackData.split('_')[2];
  await showItemInfo(ctx, itemId, restaurantId); // 🔥 Usar la nueva función que edita
}

// --- VER CARRITO ---
async function handleViewCart(ctx, userId) {
  const session = ctx.session?.cart;
  
  if (!session || session.items.length === 0) {
    await ctx.answerCbQuery();
    
    const emptyText = '🛒 *Carrito Vacío*\n\n¿Ver el menú?';
    const emptyButtons = Markup.inlineKeyboard([
      [Markup.button.callback('📋 Ver Menú', 'back_to_menu')],
      [Markup.button.callback('🏠 Inicio', 'back_to_start')]
    ]);
    
    try {
      await ctx.editMessageText(emptyText, { parse_mode: 'Markdown', ...emptyButtons });
    } catch {
      await ctx.reply(emptyText, { parse_mode: 'Markdown', ...emptyButtons });
    }
    return;
  }
  
  const subtotal = session.subtotal || session.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = session.discount;
  const total = session.total || subtotal;
  
  // 🔥 DISEÑO COMPACTO Y LIMPIO
  let cartMessage = '🛒 *Tu Carrito*\n\n';
  
  session.items.forEach((item, index) => {
    const itemType = item.type === 'combo' ? '🎁' : '🍽️';
    cartMessage += `${itemType} *${item.name}*\n`;
    const price = item.price || 0;
    const itemTotal = (price * item.quantity);
    cartMessage += `${item.quantity}x = $${itemTotal.toFixed(2)}\n\n`;
  });
  
  cartMessage += `💰 Subtotal: $${subtotal.toFixed(2)}\n`;

  if (discount && discount.amount > 0) {
    cartMessage += `🎉 Promo: -$${discount.amount.toFixed(2)}\n`;
  }
  
  cartMessage += `*TOTAL: $${total.toFixed(2)}*`;

  const buttons = [];
  
  // Botones compactos de cantidad por item
  session.items.forEach((item, index) => {
    buttons.push([
      Markup.button.callback('➖', `qty_decrease_${index}`),
      Markup.button.callback(`${item.name} (${item.quantity}x)`, `item_info_${item.id}`),
      Markup.button.callback('➕', `qty_increase_${index}`),
      Markup.button.callback('🗑️', `remove_${index}`)
    ]);
  });
  
  buttons.push([Markup.button.callback('📋 Agregar más', 'back_to_menu')]);
  buttons.push([
    Markup.button.callback('✅ Continuar', 'continue_to_delivery'),
    Markup.button.callback('🗑️ Vaciar Todo', 'confirm_clear_cart')
  ]);
  
  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText(cartMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  } catch {
    await ctx.reply(cartMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }
}

// --- CAMBIAR CANTIDAD ---
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
      await ctx.answerCbQuery('⚠️ Usa 🗑️ para eliminar');
      return;
    }
  }
  
  const { cart: updatedCart, notification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
  ctx.session.cart = updatedCart;

  if (notification) {
    await ctx.reply(`*${notification.title}*\n${notification.text}`, { parse_mode: 'Markdown' });
  }

  await handleViewCart(ctx, userId);
}

// --- ELIMINAR ITEM ---
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
  await ctx.answerCbQuery(`🗑️ ${removedItemName} eliminado`);

  const { cart: updatedCart, notification } = await DiscountRuleService.applyDynamicCombos(session, restaurantId);
  ctx.session.cart = updatedCart;

  if (notification) {
    await ctx.reply(`*${notification.title}*\n${notification.text}`, { parse_mode: 'Markdown' });
  }
  
  await handleViewCart(ctx, userId);
}

// --- CONFIRMAR VACIAR CARRITO ---
async function handleConfirmClearCart(ctx) {
    await ctx.answerCbQuery();
    await ctx.editMessageText('🗑️ *¿Vaciar todo el carrito?*', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Sí, Vaciar', 'clear_cart')],
            [Markup.button.callback('❌ No, Volver', 'view_cart')]
        ])
    });
}

// --- VACIAR CARRITO ---
async function handleClearCart(ctx, userId) {
    const session = ctx.session?.cart;
    if (session) {
        session.items = [];
        
        const { cart: updatedCart } = await DiscountRuleService.applyDynamicCombos(session, session.restaurantId);
        ctx.session.cart = updatedCart;

        await ctx.answerCbQuery('🛒 Carrito vaciado');
        
        await handleViewCart(ctx, userId);
    } else {
        await ctx.answerCbQuery('⚠️ Sesión expirada', { show_alert: true });
    }
}

// --- CONTINUAR A ENTREGA ---
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
    await ctx.answerCbQuery('⚠️ Sin métodos de entrega', { show_alert: true });
    return;
  }

  buttons.push([Markup.button.callback('« Volver', 'view_cart')]);
  session.step = SESSION_STATES.CHOOSING_DELIVERY;

  await ctx.answerCbQuery();
  await ctx.editMessageText(
    '🚀 *¿Cómo recibes tu pedido?*',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    }
  );
}

// --- DOMICILIO ---
async function handleDeliveryYes(ctx, userId) {
  const session = ctx.session?.cart;
  if (!session) {
    await ctx.answerCbQuery('⚠️ Sesión expirada');
    return;
  }

  session.deliveryType = 'delivery';
  session.step = SESSION_STATES.WAITING_LOCATION;

  await ctx.answerCbQuery();
  
  // 🔥 EDITAR el mensaje en lugar de crear uno nuevo
  await ctx.editMessageText(
    '📍 *Comparte tu ubicación*\n\nUsa el botón de abajo o el clip 📎',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🏪 Cambiar a Recoger', 'change_to_pickup')],
        [Markup.button.callback('❌ Cancelar', 'cancel_order')]
      ])
    }
  );
  
  // Enviar el teclado de ubicación por separado (este sí necesita ser nuevo mensaje)
  await ctx.reply(
    '👇 *Presiona el botón:*',
    {
      parse_mode: 'Markdown',
      ...Markup.keyboard([
        [Markup.button.locationRequest('📍 Compartir Ubicación')]
      ]).oneTime().resize()
    }
  );
}

// --- RECOGER EN TIENDA ---
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

  const address = restaurantData.info?.address || 'Dirección no disponible';
  const message = `🏪 *Recogerás en Tienda*\n\n📍 ${address}\n\n⏱️ Listo en 20-30 min`;

  await ctx.editMessageText(message, { 
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [] }
  });
  
  const userInfo = await telegramUserService.getUserInfo(userId);
  await askForPhone(ctx, session, userInfo, restaurantId);
}

// --- SELECCIÓN DE PAGO ---
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

// --- RESUMEN FINAL ---
async function showFinalConfirmation(ctx, restaurantData, isEdit = false) {
  const session = ctx.session?.cart;
  if (!session) {
    await ctx.reply('⚠️ Sesión expirada. Inicia un nuevo pedido con /pedido');
    return;
  }

  const subtotal = session.subtotal || 0;
  const deliveryFee = session.delivery?.fee || 0;
  const discount = session.discount;
  const total = session.total || (subtotal + deliveryFee);

  // 🔥 RESUMEN COMPACTO
  let confirmMessage = '📋 *Resumen Final*\n\n';
  
  confirmMessage += '🛒 *Items:*\n';
  session.items.forEach(item => {
    confirmMessage += `• ${item.name} (${item.quantity}x) - $${((item.price || 0) * item.quantity).toFixed(2)}\n`;
  });
  
  confirmMessage += `\n💰 Subtotal: $${subtotal.toFixed(2)}\n`;
  
  if (session.deliveryType === 'delivery') {
    confirmMessage += `🚚 Envío: $${deliveryFee.toFixed(2)}\n`;
  }
  
  if (discount && discount.amount > 0) {
    confirmMessage += `🎉 Promo: -$${discount.amount.toFixed(2)}\n`;
  }

  confirmMessage += `\n*TOTAL: $${total.toFixed(2)}*\n\n`;
  
  confirmMessage += `📍 ${session.deliveryType === 'delivery' ? '🏠 Domicilio' : '🏪 Recoger'}\n`;
  if (session.customerPhone) {
    confirmMessage += `📞 ${session.customerPhone}\n`;
  }
  confirmMessage += `💳 ${session.paymentMethod?.name || 'No seleccionado'}\n`;
  confirmMessage += `⏱️ 25-35 min`;

  const options = {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('✅ Confirmar', 'confirm_final')],
      [Markup.button.callback('✏️ Editar', 'view_cart')],
      [Markup.button.callback('❌ Cancelar', 'cancel_order')]
    ])
  };

  if (isEdit) {
    await ctx.editMessageText(confirmMessage, options);
  } else {
    await ctx.reply(confirmMessage, options);
  }
}

// --- CONFIRMACIÓN FINAL ---
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
        name: session.customerName || null, 
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

    delete ctx.session.cart;
    
    await telegramUserService.updateUserCommands(ctx, restaurantId);

    // 🔥--- INICIO DE LA MODIFICACIÓN ---🔥
    // ✅ CORRECCIÓN: Usar las variables 'total' y 'orderId' ya existentes para evitar redeclaración.
    const orderId = order.orderNumber || order.id.substring(0, 8).toUpperCase();

    // Mensaje simple sin pregunta de recibo
    await ctx.editMessageText(
      `✅ *¡Pedido Enviado!*\n\n` +
      `📝 Pedido #${orderId}\n` +
      `💰 Total: *$${total.toFixed(2)}*\n` +
      `⏳ Esperando confirmación del restaurante...\n\n` +
      `Te notificaremos cuando tu pedido sea confirmado.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🔎 Ver Estado', `s_o_s_${restaurantId}_${order.id}`)],
          [Markup.button.callback('🏠 Inicio', 'back_to_start')]
        ])
      }
    );

    // Preguntar por notificaciones en un mensaje SEPARADO
    await ctx.reply(
      '🔔 ¿Quieres recibir notificaciones cuando tu pedido cambie de estado?',
      Markup.inlineKeyboard([
        [Markup.button.callback('👍 Sí, notificarme', `not_y_${restaurantId}_${order.id}`)],
        [Markup.button.callback('👎 No, gracias', `not_n_${restaurantId}_${order.id}`)]
      ])
    );
    
  } catch (error) {
    console.error('❌ Error creando pedido:', error);
    
    session.step = SESSION_STATES.FINAL_CONFIRMATION;
    
    await ctx.reply(
      '❌ Error al procesar. ¿Reintentar?',
      Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Sí', 'confirm_final')],
        [Markup.button.callback('❌ No', 'cancel_order')]
      ])
    );
  }
}

// --- CANCELAR PEDIDO ---
async function handleCancelOrder(ctx, userId) {
    await ctx.answerCbQuery();
    await ctx.editMessageText('❌ *¿Cancelar el pedido?*', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ Sí', 'confirm_cancel_order_action')],
            [Markup.button.callback('⬅️ No', 'view_cart')]
        ])
    });
}

async function handleConfirmCancelOrderAction(ctx, userId) {
    delete ctx.session.cart;
    await ctx.answerCbQuery('❌ Cancelado');
    await ctx.editMessageText('❌ Tu pedido ha sido cancelado.');
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
    handleCancelOrder,
    handleConfirmCancelOrderAction,
    handleConfirmClearCart,
    handleClearCart
};