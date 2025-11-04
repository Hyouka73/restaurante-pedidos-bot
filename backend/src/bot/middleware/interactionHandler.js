// backend/src/bot/middleware/interactionHandler.js
// VERSIÓN FINAL CORREGIDA

const telegramUserService = require('../services/telegramUserService');
const configBotService = require('../services/configBotService');
const availabilityService = require('../../services/availabilityService');
const menuService = require('../../services/menuService');
const { Markup } = require('telegraf');

// --- Handlers de Lógica ---
const { 
  SESSION_STATES,
  askPaymentMethod,
  askForPhone
} = require('../handlers/orderHandler');
const { showMenuView, showItemInfo } = require('../handlers/menuHandler');
const { handleRecommendation } = require('../handlers/recommendationHandler');
const { handleComboBuilder } = require('../handlers/comboBuilderHandler');

// Handlers de Notificación (importaciones individuales)
const { 
  handleNotificationPreference, 
  handleShowOrderStatus,
  handleRefreshOrderStatus,
  handleCancelOrderRequest,
  handleConfirmCancelOrder,
  handleShowReceipt,
  handleAskReceiptResponse
} = require('../handlers/notificationHandler');

// --- 🔥 CORRECCIÓN CRÍTICA DE IMPORTACIÓN ---
// Importamos *ambos* handlers, cart y checkout, como objetos
const cartHandler = require('../handlers/cartHandler');
const checkoutHandler =require('../handlers/checkoutHandler'); 
// --- Fin de la Corrección ---

module.exports = async (ctx) => {
  // Solo procesar callbacks de botones
  if (!ctx.callbackQuery) return;
  
  const userId = ctx.from.id; 
  const callbackData = ctx.callbackQuery.data; 
  const messageText = ctx.callbackQuery.message?.text || '';

  try {
    // Obtener y almacenar restaurantId en ctx.state
    if (!ctx.state.restaurantId) {
        ctx.state.restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
        if (!ctx.state.restaurantId) {
            await ctx.answerCbQuery('⚠️ No se pudo identificar el restaurante. Usa /start primero.', { show_alert: true });
            return;
        }
    }
    const restaurantId = ctx.state.restaurantId;
    const session = ctx.session?.cart;
    
    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const messages = restaurantData.messages || {}; 
    const features = restaurantData.features || {};

    // 1. Verificación de Bot Habilitado
    if (features.botEnabled === false) { 
      const disabledMessage = messages.botDisabled || 'El bot está temporalmente desactivado.'; 
      await ctx.answerCbQuery(disabledMessage, { show_alert: true }); 
      return;
    }

    // 2. Verificación de Disponibilidad (solo para acciones de pedido)
    const orderActions = [
        'add_item_', 'item_info_', 'view_cart', 'qty_', 'remove_', 
        'continue_to_delivery', 'delivery_', 'pickup', 'payment_', 'confirm_final',
        'change_to_pickup', 'build_combo', 'combo_select'
    ];
    const involvesOrder = orderActions.some(prefix => callbackData.startsWith(prefix)); 
    
    if (involvesOrder) {
      const availability = await availabilityService.checkAvailability(restaurantId);
      if (availability.status !== 'open') { 
        await ctx.answerCbQuery('😔 Lo sentimos, ya no podemos aceptar pedidos. ' + (availability.reason || ''), { show_alert: true });
        return; 
      }
    }

    // === ENRUTAMIENTO DE ACCIONES ===

    // Flujo de Recomendaciones
    if (callbackData.startsWith('start_recommendation') || callbackData.startsWith('rec_')) {
      await handleRecommendation(ctx);
      return;
    }

    // Flujo de Armado de Combo Manual
    if (callbackData.startsWith('build_combo') || callbackData.startsWith('combo_select')) {
        await handleComboBuilder(ctx);
        return;
    }

    // Flujo de Menú, Info y Navegación
    if (callbackData === 'init_order') {
      await ctx.answerCbQuery('🛒 Iniciando pedido...');
      const orderHandler = require('../handlers/orderHandler'); // Carga peresoza
      await orderHandler(ctx); 
      return;
    }
    
    if (callbackData === 'show_menu' || callbackData === 'back_to_menu') {
      await ctx.answerCbQuery();
      try {
        await showMenuView(ctx, 1, true); // Intentamos editar
      } catch (e) {
        await showMenuView(ctx, 1, false); // Si falla, enviamos uno nuevo
      }
      return;
    }
    if (callbackData.startsWith('menu_page_')) {
      const page = parseInt(callbackData.split('_')[2], 10);
      await showMenuView(ctx, page, true);
      return;
    }
     if (callbackData === 'show_info') {
      await ctx.answerCbQuery();
      // (Toda la lógica para mostrar info... es largo pero está bien aquí)
      const info = restaurantData.info || {}; 
      let infoMessage = `ℹ️ *Información del Restaurante*\n\n`;
      infoMessage += `🏪 *${info.name || 'Restaurante'}*\n\n`;
      if (info.description) { infoMessage += `📝 ${info.description}\n\n`; } 
      if (info.address) { infoMessage += `📍 *Dirección:*\n${info.address}\n\n`; }
      if (info.phone) { infoMessage += `📞 *Teléfono:* ${info.phone}\n\n`; }
      const hours = restaurantData.hours || {};
      infoMessage += `⏰ *Horarios:*\n`;
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      dayKeys.forEach((key, index) => { 
        const dayHours = hours[key];
        if (dayHours) {
          if (dayHours.closed) { infoMessage += `   ${days[index]}: Cerrado\n`; }
          else { infoMessage += `   ${days[index]}: ${dayHours.open} - ${dayHours.close}\n`; }
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
      try { await ctx.deleteMessage(); } catch(e) {}
      await startHandler(ctx); 
      return;
    }

    // Handler para limpiar mensajes (ej. "No, gracias" en cross-sell)
    if (callbackData === 'delete_message') {
      try {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();
      } catch (e) {
        console.warn('No se pudo borrar el mensaje (quizás era muy antiguo)');
      }
      return;
    }

    // Handlers para el flujo de teléfono
    if (callbackData === 'confirm_phone_yes') {
      await ctx.answerCbQuery('Teléfono confirmado!');
      session.step = SESSION_STATES.SELECTING_PAYMENT;
      await askPaymentMethod(ctx, session, restaurantId, true); // isEdit = true
      return;
    }
    
    if (callbackData === 'confirm_phone_no') {
      await ctx.answerCbQuery('Ingresa un nuevo número');
      // Llamamos a la función, que ahora sabe que no hay teléfono y pedirá uno
      await askForPhone(ctx, session, null, restaurantId, true); // isEdit = true
      return;
    }

    // --- HANDLERS DE NOTIFICACIÓN DE PEDIDO ---
    if (callbackData.startsWith('not_')) {
      await handleNotificationPreference(ctx, callbackData);
      return;
    }
    if (callbackData.startsWith('s_o_s_')) { // (s_o_s_ = show_order_status)
      await handleShowOrderStatus(ctx, callbackData);
      return;
    }
    if (callbackData.startsWith('refresh_order_')) {
      await handleRefreshOrderStatus(ctx, callbackData);
      return;
    }
    if (callbackData.startsWith('cancel_order_')) {
      await handleCancelOrderRequest(ctx, callbackData);
      return;
    }
    if (callbackData.startsWith('confirm_cancel_')) {
      await handleConfirmCancelOrder(ctx, callbackData);
      return;
    }
    if (callbackData.startsWith('ar_')) { // (ar_ = ask_receipt)
      await handleAskReceiptResponse(ctx, callbackData);
      return;
    }
    if (callbackData.startsWith('show_receipt_')) {
      await handleShowReceipt(ctx, callbackData);
      return;
    }
    if (callbackData === 'retry_my_order') {
      await ctx.answerCbQuery();
      const myOrderHandler = require('../handlers/myOrderHandler');
      await myOrderHandler(ctx);
      return;
    }

    // --- 🔥 INICIO DE LA DELEGACIÓN CORREGIDA ---

    // --- Flujo de Carrito (cartHandler) ---
    if (callbackData.startsWith('add_item_')) {
      await cartHandler.handleAddItem(ctx, callbackData, userId, restaurantId);
      
      // Lógica de Cross-Sell (Venta Cruzada)
      const itemId = callbackData.split('_')[2];
      const item = await menuService.getMenuItem(restaurantId, itemId);
      if (item && item.sugerir_items && item.sugerir_items.length > 0) { // [cite: 61-62]
        const suggestionPromises = item.sugerir_items.map(suggId => menuService.getMenuItem(restaurantId, suggId));
        const rawSuggestions = await Promise.all(suggestionPromises);
        const suggestions = rawSuggestions.filter(s => s && s.available !== false);
        if (suggestions.length > 0) {
          
          // 1. Recopilar todos los IDs de las sugerencias
          const suggestionIds = suggestions.map(s => s.id);
          // 2. Crear un callback que contenga TODOS los IDs, separados por ':'
          const addAllCallback = `add_suggestion_group:${suggestionIds.join(':')}`;

          // 3. Los botones individuales AHORA llaman al callback grupal
          const suggestionButtons = suggestions.map(s => 
            Markup.button.callback(`➕ ${s.name} ($${s.price})`, addAllCallback)
          );
          
          suggestionButtons.push(Markup.button.callback('❌ No, gracias', 'delete_message'));
          await ctx.reply(`💡 Ya que llevas *${item.name}*, quizás te interese también:`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(suggestionButtons, { columns: 1 })
          });
        }
      }
      return; // Importante para no continuar al siguiente if
    }
    
    // 🔥 --- AÑADIR ESTE NUEVO BLOQUE --- 🔥
    if (callbackData.startsWith('add_suggestion_group:')) {
      // Obtiene los IDs de la callback (ej. ['id1', 'id2', 'id3'])
      const idsToAdd = callbackData.split(':').slice(1); 
      
      if (idsToAdd.length > 0) {
        await ctx.answerCbQuery(`Añadiendo ${idsToAdd.length} sugerencias...`);
        
        // Llama a la función que ya tienes en cartHandler
        await cartHandler.handleAddSuggestionGroup(ctx, idsToAdd, userId, restaurantId);
        
        // 🔥 CORRECCIÓN: Simplemente mostramos el carrito. La nueva lógica en handleViewCart se encargará de editar el mensaje correcto.
        await cartHandler.handleViewCart(ctx, userId);
      } else {
        await ctx.answerCbQuery('⚠️ No se encontraron sugerencias.', { show_alert: true });
      }
      return;
    }
    // 🔥 --- FIN DEL NUEVO BLOQUE --- 🔥

    if (callbackData.startsWith('item_info_')) {
      const itemId = callbackData.split('_')[2];
      await showItemInfo(ctx, itemId, restaurantId);
      return;
    }
    if (callbackData === 'view_cart') {
      await cartHandler.handleViewCart(ctx, userId);
      return;
    }
    if (callbackData.startsWith('qty_')) {
      await cartHandler.handleQuantityChange(ctx, callbackData, userId, restaurantId);
      return;
    }
    if (callbackData.startsWith('remove_')) {
      await cartHandler.handleRemoveItem(ctx, callbackData, userId, restaurantId);
      return;
    }
    if (callbackData === 'confirm_clear_cart') {
      await cartHandler.handleConfirmClearCart(ctx);
      return;
    }
    if (callbackData === 'clear_cart') {
      await cartHandler.handleClearCart(ctx, userId);
      return;
    }

    // --- Flujo de Checkout (checkoutHandler) ---
    if (callbackData === 'continue_to_delivery') {
      await checkoutHandler.handleContinueToDelivery(ctx, userId, restaurantId);
      return;
    }
    if (callbackData === 'delivery_yes') {
      await checkoutHandler.handleDeliveryYes(ctx, userId);
      return;
    }
    if (callbackData === 'pickup' || callbackData === 'change_to_pickup') {
      await checkoutHandler.handlePickup(ctx, userId, restaurantId);
      return;
    }
    if (callbackData.startsWith('payment_')) {
      await checkoutHandler.handlePaymentSelection(ctx, callbackData, userId, restaurantId);
      return;
    }
    if (callbackData === 'confirm_final') {
      await checkoutHandler.handleFinalConfirmation(ctx, userId, restaurantId);
      return;
    }
    if (callbackData === 'cancel_order') {
      await checkoutHandler.handleCancelOrder(ctx, userId);
      return;
    }
    if (callbackData === 'confirm_cancel_order_action') {
      await checkoutHandler.handleConfirmCancelOrderAction(ctx, userId);
      return;
    }

    // --- 🔥 FIN DE LA DELEGACIÓN CORREGIDA ---

    console.warn(`⚠️ Callback no manejado: ${callbackData}`); 
    await ctx.answerCbQuery('⚠️ Acción no reconocida');

  } catch (error) {
    console.error('❌ [interactionHandler] Error:', error);
    if (error.message && error.message.includes('Connection is closed')) {
      await ctx.answerCbQuery('⚠️ Problema de sesión, reintentando...', { show_alert: true }).catch(console.error);
      try {
        await ctx.reply('😔 Lo sentimos, estamos teniendo problemas técnicos. Por favor, intenta de nuevo en un momento.');
      } catch (replyError) {
        console.error('Error enviando mensaje de error de Redis:', replyError);
      }
      return;
    }

    await ctx.answerCbQuery('❌ Hubo un error al procesar tu selección.').catch(console.error);
    try {
      await ctx.reply('❌ Ocurrió un error inesperado.\n\nPor favor intenta nuevamente o usa /start para reiniciar.');
    } catch (replyError) {
      console.error('Error enviando mensaje de error:', replyError);
    }
  }
};