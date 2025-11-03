// backend/src/bot/handlers/notificationHandler.js

const { db, admin } = require('../../config/firebase');
const orderService = require('../../services/orderService');
const receiptService = require('../../services/receiptService');
const { formatOrderStatus } = require('./myOrderHandler');
const { Markup } = require('telegraf');

const configBotService = require('../services/configBotService'); 

// Comandos
const defaultCommands = [
    { command: 'start', description: 'Iniciar conversación' },
    { command: 'menu', description: 'Ver menú completo' },
    { command: 'pedido', description: 'Hacer un pedido' },
];
const commandsWithMyOrder = [
    ...defaultCommands,
    { command: 'mipedido', description: 'Ver estado de mi pedido' },
];

/**
 * 🔥 FUNCIÓN CORREGIDA
 * Fusiona la respuesta y el menú de navegación en UNA SOLA EDICIÓN.
 */
async function handleNotificationPreference(ctx, callbackData) {
  const [, choice, restaurantId, orderId] = callbackData.split('_');
  const userId = ctx.from.id;
  
  let answer = '';
  if (choice === 'yes') {
    answer = '✅ ¡Perfecto! Te mantendremos informado.';
  } else {
    answer = '👍 Entendido. Puedes usar /mipedido para ver el estado.';
  }
  await ctx.answerCbQuery(answer);
  
  // Guardar preferencia en la DB
  try {
    if (choice === 'yes') {
      await ctx.telegram.setMyCommands(commandsWithMyOrder, { 
        scope: { type: 'chat', chat_id: userId } 
      });
    } else if (choice === 'no') {
      const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId);
      await orderRef.update({ notificationsEnabled: false });
      await ctx.telegram.setMyCommands(commandsWithMyOrder, { 
        scope: { type: 'chat', chat_id: userId } 
      });
    }
  } catch (error) {
    console.error('Error updating notification preference:', error);
  }
  
  // 🔥 SOLUCIÓN FLUJO ROTO:
  // Editamos el mensaje para MOSTRAR la respuesta Y el menú de navegación.
  // Respuesta simple sin menú innecesario
  await ctx.editMessageText(
    `${answer}\n\nPuedes usar /mipedido en cualquier momento para ver el estado de tu pedido.`,
    { parse_mode: 'Markdown' }
  );
}

/**
 * Muestra el estado de un pedido
 */
async function handleShowOrderStatus(ctx, callbackData) {
  const parts = callbackData.split('_');
  const restaurantId = parts[2];
  const orderId = parts[3];
  await ctx.answerCbQuery();
  
  try {
    const order = await orderService.getOrder(restaurantId, orderId);
    const statusMessage = formatOrderStatus(order);
    const actionButtons = [];

    // 🔥 LÓGICA DE CANCELAR: Solo si es 'pending'
    if (order.status === 'pending') {
      actionButtons.push([Markup.button.callback('❌ Cancelar Pedido', `cancel_order_${order.restaurantId}_${order.id}`)]);
    }
    
    actionButtons.push([Markup.button.callback('🔄 Actualizar', `refresh_order_${restaurantId}_${orderId}`)]);
    actionButtons.push([Markup.button.callback('🧾 Ver Recibo', `show_receipt_${restaurantId}_${orderId}`)]);
    actionButtons.push([Markup.button.callback('📞 Contactar', 'show_info')]);
    
    await ctx.editMessageText(statusMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(actionButtons)
    });
  } catch (error) {
    console.error('Error showing order status:', error);
    await ctx.editMessageText('❌ Hubo un error al consultar el estado de tu pedido.');
  }
}

/**
 * Refresca el estado de un pedido
 */
async function handleRefreshOrderStatus(ctx, callbackData) {
  const [, , restaurantId, orderId] = callbackData.split('_');
  await ctx.answerCbQuery('🔄 Actualizando...');
  
  try {
    const order = await orderService.getOrder(restaurantId, orderId);
    const statusMessage = formatOrderStatus(order);
    
    const actionButtons = [];
    if (order.status === 'pending') {
      actionButtons.push([Markup.button.callback('❌ Cancelar Pedido', `cancel_order_${order.restaurantId}_${order.id}`)]);
    }
    actionButtons.push([Markup.button.callback('🔄 Actualizar', `refresh_order_${restaurantId}_${orderId}`)]);
    actionButtons.push([Markup.button.callback('🧾 Ver Recibo', `show_receipt_${restaurantId}_${orderId}`)]);
    actionButtons.push([Markup.button.callback('📞 Contactar', 'show_info')]);
    
    await ctx.editMessageText(statusMessage, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(actionButtons)
    });
  } catch (error) {
    // Si falla por "message is not modified" (doble clic), solo avisa.
    if (error.description && error.description.includes('message is not modified')) {
      await ctx.answerCbQuery('✅ Ya está actualizado');
    } else {
      console.error('Error refreshing order status:', error);
      await ctx.answerCbQuery('❌ Error al refrescar', { show_alert: true });
    }
  }
}

/**
 * Muestra la confirmación de cancelación
 */
async function handleCancelOrderRequest(ctx, callbackData) {
  const [, , restaurantId, orderId] = callbackData.split('_');
  await ctx.answerCbQuery();
  
  await ctx.editMessageText(
    `❌ *¿Seguro que quieres cancelar el pedido #${orderId.substring(0, 6)}?*\n\nEsta acción no se puede deshacer.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('✅ Sí, Cancelar', `confirm_cancel_${restaurantId}_${orderId}`)],
        [Markup.button.callback('« Volver', `refresh_order_${restaurantId}_${orderId}`)]
      ])
    }
  );
}

/**
 * Confirma y ejecuta la cancelación
 */
async function handleConfirmCancelOrder(ctx, callbackData) {
  const [, , restaurantId, orderId] = callbackData.split('_');
  await ctx.answerCbQuery('⏳ Cancelando...');
  
  try {
  	const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId);
  	await orderRef.update({ 
  	  status: 'cancelled',
  	  statusHistory: admin.firestore.FieldValue.arrayUnion({
  	    status: 'cancelled',
  	    timestamp: new Date(),
  	    notes: 'Pedido cancelado por el usuario desde el bot.'
  	  })
  	});
  	
    // 🔥 SOLUCIÓN MENSAJES RESIDUALES:
    // Editamos el mensaje a "Cancelado" Y le ponemos el botón de inicio.
  	await ctx.editMessageText(
      '❌ Tu pedido ha sido cancelado.',
      Markup.inlineKeyboard([
        [Markup.button.callback('🏠 Volver al inicio', 'back_to_start')]
      ])
    );
  } catch (error) {
  	console.error('Error confirming cancel order:', error);
  	await ctx.editMessageText('❌ Hubo un error al intentar cancelar el pedido.');
  }
}

/**
 * Genera y envía un recibo (HTML)
 */
async function handleShowReceipt(ctx, callbackData) {
  const [, , restaurantId, orderId] = callbackData.split('_');
  const orderDataForName = await orderService.getOrder(restaurantId, orderId);
  const orderNumber = orderDataForName.orderNumber || orderId.substring(0, 6);
  
  await ctx.answerCbQuery('🧾 Generando recibo...');

  try {
    const order = await orderService.getOrder(restaurantId, orderId);
    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const receiptHtml = receiptService.generateHtmlReceipt(order, restaurantData);
    const receiptBuffer = Buffer.from(receiptHtml, 'utf-8');

    await ctx.replyWithDocument(
      {
        source: receiptBuffer,
        filename: `recibo-${orderNumber}.html`
      },
      { 
        caption: `Aquí está tu recibo #${orderNumber}.\n\nÁbrelo en tu navegador para imprimir o guardar como PDF.`
      }
    );
  } catch (error) {
    console.error('Error generating HTML receipt:', error);
  	await ctx.answerCbQuery('❌ Error al generar recibo', { show_alert: true });
  }
}

/**
 * Maneja la respuesta (Sí/No) a la pregunta del recibo.
 */
async function handleAskReceiptResponse(ctx, callbackData) {
  const parts = callbackData.split('_');
  const choice = parts[1]; // 'y' o 'n'
  const restaurantId = parts[2];
  const orderId = parts[3];

  try {
    await ctx.deleteMessage(); // Borrar la pregunta del recibo
  } catch (e) {
    console.warn("No se pudo borrar mensaje de pregunta de recibo");
  }

  if (choice === 'y') {
    await handleShowReceipt(ctx, `show_receipt_${restaurantId}_${orderId}`);
    await ctx.answerCbQuery('📄 Recibo enviado');
  } else {
    await ctx.answerCbQuery('👍 Entendido');
  }
}

/**
 * 🔥 NUEVA FUNCIÓN: Se ejecuta cuando el pedido cambia a "confirmed"
 * Envía el recibo automáticamente O pregunta si lo quiere
 */
async function handleOrderConfirmed(bot, restaurantId, orderId, chatId) {
  try {
    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const autoSendReceipt = restaurantData.features?.autoSendReceipt || false;

    if (autoSendReceipt) {
      // Enviar recibo directamente sin preguntar
      // (La lógica de handleShowReceipt es compleja, así que la replicamos aquí para el bot)
      const order = await orderService.getOrder(restaurantId, orderId);
      const receiptHtml = receiptService.generateHtmlReceipt(order, restaurantData);
      const receiptBuffer = Buffer.from(receiptHtml, 'utf-8');
      const orderNumber = order.orderNumber || orderId.substring(0, 6);

      await bot.telegram.sendDocument(chatId, {
        source: receiptBuffer,
        filename: `recibo-${orderNumber}.html`
      }, {
        caption: `🧾 Aquí está tu recibo de compra #${orderNumber}.\n\nÁbrelo en tu navegador para imprimir o guardar como PDF.`
      });
    } else {
      // Preguntar si lo quiere
      await bot.telegram.sendMessage(
        chatId,
        '🧾 Tu pedido ha sido confirmado. ¿Te gustaría recibir un recibo de compra?',
        Markup.inlineKeyboard([
          [Markup.button.callback('✅ Sí, enviarlo', `ar_y_${restaurantId}_${orderId}`)],
          [Markup.button.callback('❌ No, gracias', `ar_n_${restaurantId}_${orderId}`)]
        ])
      );
    }
  } catch (error) {
    console.error('Error gestionando el recibo al confirmar pedido:', error);
  }
}

// --- EXPORTACIONES ---
module.exports = {
  handleNotificationPreference,
  handleShowOrderStatus,
  handleRefreshOrderStatus,
  handleCancelOrderRequest,
  handleConfirmCancelOrder,
  handleShowReceipt,
  handleAskReceiptResponse,
  handleOrderConfirmed, // 🔥 NUEVO
};