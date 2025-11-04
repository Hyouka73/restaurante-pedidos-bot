// backend/src/bot/handlers/notificationHandler.js
const { db, admin } = require('../../config/firebase');
const orderService = require('../../services/orderService');
const receiptService = require('../../services/receiptService');
const configBotService = require('../services/configBotService');
const { formatOrderStatus } = require('./myOrderHandler'); // Usa el formateador de myOrder
const notificationKeyboards = require('../keyboards/notificationKeyboards'); // Importamos el nuevo archivo
const { Markup } = require('telegraf');

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
 * Maneja la preferencia de notificación (Sí/No).
 */
async function handleNotificationPreference(ctx, callbackData) {
  const [, choice, restaurantId, orderId] = callbackData.split('_');
  const userId = ctx.from.id;

  // 1. Obtener el mensaje desde el keyboard
  const { message } = notificationKeyboards.getNotificationPreferenceMessage(choice);
  await ctx.answerCbQuery(choice === 'yes' ? '✅ ¡Perfecto!' : '👍 Entendido.');

  // 2. Lógica de guardado
  try {
    if (choice === 'no') {
      const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId);
      await orderRef.update({ notificationsEnabled: false });
    }
    // El comando mipedido se añade de todas formas
    await ctx.telegram.setMyCommands(commandsWithMyOrder, {
      scope: { type: 'chat', chat_id: userId }
    });
  } catch (error) {
    console.error('Error updating notification preference:', error);
  }

  // 3. Editar el mensaje original para que no queden botones
  await ctx.editMessageText(message, { parse_mode: 'Markdown' });
}

/**
 * Muestra el estado de un pedido.
 */
async function handleShowOrderStatus(ctx, callbackData) {
  const [, , restaurantId, orderId] = callbackData.split('_');
  await ctx.answerCbQuery();
  try {
    // 1. Lógica
    const order = await orderService.getOrder(restaurantId, orderId);
    const statusMessage = formatOrderStatus(order);
    
    // 2. Obtener teclado
    const keyboard = notificationKeyboards.getOrderStatusKeyboard(order, restaurantId, orderId);

    // 3. Responder
    await ctx.editMessageText(statusMessage, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  } catch (error) {
    console.error('Error showing order status:', error);
    await ctx.editMessageText('❌ Hubo un error al consultar el estado de tu pedido.');
  }
}

/**
 * Refresca el estado de un pedido.
 */
async function handleRefreshOrderStatus(ctx, callbackData) {
    const [, , restaurantId, orderId] = callbackData.split('_');
    await ctx.answerCbQuery('🔄 Actualizando...');
    try {
        // 1. Lógica
        const order = await orderService.getOrder(restaurantId, orderId);
        const statusMessage = formatOrderStatus(order);
        
        // 2. Obtener teclado
        const keyboard = notificationKeyboards.getOrderStatusKeyboard(order, restaurantId, orderId);
        
        // 3. Responder
        await ctx.editMessageText(statusMessage, {
            parse_mode: 'Markdown',
            ...keyboard
        });
    } catch (error) {
        if (error.description && error.description.includes('message is not modified')) {
            await ctx.answerCbQuery('✅ Ya está actualizado');
        } else {
            console.error('Error refreshing order status:', error);
            await ctx.answerCbQuery('❌ Error al refrescar', { show_alert: true });
        }
    }
}


/**
 * Muestra la confirmación de cancelación.
 */
async function handleCancelOrderRequest(ctx, callbackData) {
  const [, , restaurantId, orderId] = callbackData.split('_');
  await ctx.answerCbQuery();
  
  // 1. Obtener mensaje y teclado
  const { message, keyboard } = notificationKeyboards.getCancelOrderRequestMessage(restaurantId, orderId);
  
  // 2. Responder
  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    ...keyboard
  });
}

/**
 * Confirma y ejecuta la cancelación.
 */
async function handleConfirmCancelOrder(ctx, callbackData) {
    const [, , restaurantId, orderId] = callbackData.split('_');
    await ctx.answerCbQuery('⏳ Cancelando...');
    try {
        // 1. Lógica de cancelación
        const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId);
        await orderRef.update({
            status: 'cancelled',
            statusHistory: admin.firestore.FieldValue.arrayUnion({
                status: 'cancelled',
                timestamp: new Date(),
                notes: 'Pedido cancelado por el usuario desde el bot.'
            })
        });
        
        // 2. Obtener mensaje de éxito
        const { message, keyboard } = notificationKeyboards.getOrderCancelledMessage();
        await ctx.editMessageText(message, { ...keyboard });
    } catch (error) {
        console.error('Error confirming cancel order:', error);
        // 3. Obtener mensaje de error
        const { message } = notificationKeyboards.getOrderCancelledErrorMessage();
        await ctx.editMessageText(message);
    }
}

/**
 * Genera y envía un recibo (HTML).
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
    // Borra la pregunta de "Quieres recibo?" para limpiar el chat
    await ctx.deleteMessage();
  } catch (e) {
    console.warn("No se pudo borrar mensaje de pregunta de recibo");
  }

  if (choice === 'y') {
    await handleShowReceipt(ctx, `show_receipt_${restaurantId}_${orderId}`);
    // answerCbQuery no es necesario aquí porque handleShowReceipt ya lo hace.
  } else {
    await ctx.answerCbQuery('👍 Entendido');
  }
}

/**
 * Se ejecuta cuando el pedido cambia a "confirmed".
 */
async function handleOrderConfirmed(bot, restaurantId, orderId, chatId) {
  try {
    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const autoSendReceipt = restaurantData.features?.autoSendReceipt || false;

    if (autoSendReceipt) {
      // (Lógica para enviar recibo directamente)
      const order = await orderService.getOrder(restaurantId, orderId);
      const receiptHtml = receiptService.generateHtmlReceipt(order, restaurantData);
      const receiptBuffer = Buffer.from(receiptHtml, 'utf-8');
      const orderNumber = order.orderNumber || orderId.substring(0, 6);
      await bot.telegram.sendDocument(chatId, {
        source: receiptBuffer,
        filename: `recibo-${orderNumber}.html`
      }, {
        caption: `🧾 Aquí está tu recibo de compra #${orderNumber}.`
      });
    } else {
      // Preguntar si lo quiere, usando el keyboard
      const { message, keyboard } = notificationKeyboards.getAskForReceiptMessage(restaurantId, orderId);
      await bot.telegram.sendMessage(chatId, message, { ...keyboard });
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
  handleOrderConfirmed,
};