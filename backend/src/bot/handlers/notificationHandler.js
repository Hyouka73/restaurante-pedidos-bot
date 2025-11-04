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
  
  try {
    const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId);
    if (choice === 'yes') {
      await ctx.answerCbQuery('✅ ¡Perfecto! Te mantendremos informado.');
      await ctx.telegram.setMyCommands(commandsWithMyOrder, {
        scope: { type: 'chat', chat_id: userId } 
      });
      await orderRef.set({ notificationsEnabled: true }, { merge: true });
      // Eliminar el mensaje de preferencia de notificación
      try {
        await ctx.deleteMessage();
      } catch (e) {
        console.warn('No se pudo borrar el mensaje de preferencia de notificación:', e);
      }
      // Enviar el estado del pedido como un nuevo mensaje
      await handleShowOrderStatus(ctx, `s_o_s_${restaurantId}_${orderId}`, true); // true para indicar que es un nuevo mensaje
    } else if (choice === 'no') {
      await ctx.answerCbQuery('👍 Entendido.');
      await orderRef.set({ notificationsEnabled: false }, { merge: true });
      // Editamos el mensaje para confirmar y dar la alternativa
      await ctx.editMessageText('👍 Entendido. No recibirás notificaciones automáticas.\n\nPuedes usar /mipedido en cualquier momento para ver el estado de tu pedido con el formato actualizado.');
    }
  } catch (error) {
    console.error('Error updating notification preference:', error);
  }
}

/**
 * Muestra el estado de un pedido.
 */
async function handleShowOrderStatus(ctx, callbackData, isNewMessage = false) {
  // Aseguramos que los IDs se tomen del callbackData, que puede venir de 's_o_s_' o 'not_'
  const parts = callbackData.split('_');
  // El prefijo es "s_o_s_", por lo que los IDs comienzan en el índice 3
  const restaurantId = parts[3];
  const orderId = parts[4];
  
  // Responde al CbQuery solo si no fue respondido ya (ej. en handleNotificationPreference)
  if (!ctx.answered) await ctx.answerCbQuery();
  
  try {
    const order = await orderService.getOrder(restaurantId, orderId);
    const statusMessage = formatOrderStatus(order);
    const keyboard = notificationKeyboards.getOrderStatusKeyboard(order, restaurantId, orderId);

    let msg;
    if (isNewMessage) {
      // Enviamos un nuevo mensaje
      msg = await ctx.reply(statusMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } else {
      // Editamos el mensaje existente
      msg = await ctx.editMessageText(statusMessage, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }

    // Guardamos el ID del mensaje en la orden de FIRESTORE si es un nuevo mensaje o si no estaba guardado
    if (msg && msg.message_id && (isNewMessage || !order.telegramMessageId)) {
        const orderRef = db.collection('restaurants').doc(restaurantId).collection('orders').doc(orderId);
        await orderRef.set({ telegramMessageId: msg.message_id }, { merge: true });
        console.log(`[notificationHandler] Message ID ${msg.message_id} guardado en la orden ${orderId}`);
    }
    
  } catch (error) {
    console.error('Error showing order status:', error);
    // Si falla al editar, intentamos enviar uno nuevo como fallback
    if (ctx.callbackQuery && ctx.callbackQuery.message) {
      await ctx.reply('❌ Hubo un error al consultar el estado de tu pedido. Por favor, usa /mipedido para ver el estado actualizado.');
    } else {
      await ctx.editMessageText('❌ Hubo un error al consultar el estado de tu pedido.');
    }
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
  const [, , restaurantId, orderId] = callbackData.split('_'); // [cite:130]
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
    await ctx.answerCbQuery('👍 Entendido. Puedes usar /mipedido para ver el estado de tu pedido.');
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