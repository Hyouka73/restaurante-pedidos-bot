// backend/src/bot/middleware/interactionHandler.js
// VERSIÓN FINAL REFACTORIZADA

const { db } = require('../../config/firebase');
const menuService = require('../../services/menuService');
const orderService = require('../../services/orderService');
const telegramUserService = require('../services/telegramUserService');
const configBotService = require('../services/configBotService');
const DiscountRuleService = require('../../services/discountRuleService');
const availabilityService = require('../../services/availabilityService');
const { Markup } = require('telegraf');
const { 
  SESSION_STATES,
  askPaymentMethod,
  askForPhone
} = require('../handlers/orderHandler');

const { showMenuView, showItemInfo } = require('../handlers/menuHandler');
const { handleRecommendation } = require('../handlers/recommendationHandler');
const { handleComboBuilder } = require('../handlers/comboBuilderHandler');
// Importar las funciones del nuevo handler de notificaciones
const { 
  handleNotificationPreference, 
  handleShowOrderStatus,
  handleRefreshOrderStatus,      // NUEVO
  handleCancelOrderRequest,       // NUEVO
  handleConfirmCancelOrder,        // NUEVO
  handleShowReceipt,
  handleAskReceiptResponse // 🔥 AÑADIR
} = require('../handlers/notificationHandler');
// 🔥 CORRECCIÓN CRÍTICA DE IMPORTACIÓN
// Importamos *todas* las funciones de cartHandler
const cartHandler = require('../handlers/cartHandler');

module.exports = async (ctx) => {
  // Solo procesar callbacks de botones
  if (!ctx.callbackQuery) return; 
  
  const userId = ctx.from.id; 
  const callbackData = ctx.callbackQuery.data; 
  const messageText = ctx.callbackQuery.message?.text || ''; // Texto del mensaje donde se hizo clic
  try {
    // 🔥 NUEVO: Obtener y almacenar restaurantId en ctx.state
    if (!ctx.state.restaurantId) {
        console.log('🔍 [interactionHandler] Buscando restaurantId...');
        ctx.state.restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);
        if (!ctx.state.restaurantId) {
            await ctx.answerCbQuery('⚠️ No se pudo identificar el restaurante. Usa /start primero.', { show_alert: true });
            return; // Detener si no se puede identificar
        }
        console.log(`✅ [interactionHandler] restaurantId guardado en ctx.state: ${ctx.state.restaurantId}`);
    }

    const restaurantId = ctx.state.restaurantId; // Leer desde ctx.state
    const session = ctx.session?.cart;
    // 🔥 FIN NUEVO
    
    const restaurantData = await configBotService.getRestaurantData(restaurantId); 
    const messages = restaurantData.messages || {}; 
    const features = restaurantData.features || {}; 

    // 1. Verificación de Bot Habilitado
    if (features.botEnabled === false) { 
      const disabledMessage = messages.botDisabled ||
        'El bot está temporalmente desactivado.'; 
      await ctx.answerCbQuery(disabledMessage, { show_alert: true }); 
      return; 
    }

    // 2. Verificación de Disponibilidad (solo para acciones de pedido)
    const orderActions = [
        'add_item_', 'item_info_', 'view_cart', 'qty_', 'remove_', 
        'continue_to_delivery', 'delivery_', 'pickup', 'payment_', 'confirm_final',
        'change_to_pickup' // Añadido para cubrir todos los casos
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
    if (callbackData.startsWith('start_recommendation') || callbackData.startsWith('rec_add')) {
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
      const orderHandler = require('../handlers/orderHandler'); // Cargar solo al necesitar
      await orderHandler(ctx); 
      return;
    }
    
    // --- 🔥 CORRECCIÓN: Flujo de "show_menu" Limpio ---
    if (callbackData === 'show_menu' || callbackData === 'back_to_menu') {
      await ctx.answerCbQuery(); 
      // Editamos el mensaje actual O borramos y enviamos uno nuevo
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
      const info = restaurantData.info || {}; 
      let infoMessage = `ℹ️ *Información del Restaurante*\n\n`;
      infoMessage += `🏪 *${info.name || 'Restaurante'}*\n\n`; 
      if (info.description) { infoMessage += `📝 ${info.description}\n\n`; } 
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
    // --- 🔥 CORRECCIÓN: Flujo de "Bienvenida" Limpio ---
    if (callbackData === 'back_to_start') {
      await ctx.answerCbQuery(); 
      const startHandler = require('../handlers/startHandler'); // Cargar solo al necesitar
      // Borramos el mensaje actual antes de mostrar el de bienvenida
      try { await ctx.deleteMessage(); } catch(e) {}
      await startHandler(ctx); 
      return;
    }

    // --- 🔥 NUEVO HANDLER (Para limpiar el chat) ---
    if (callbackData === 'delete_message') {
      try {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();
      } catch (e) {
        console.warn('No se pudo borrar el mensaje (quizás era muy antiguo)');
      }
      return;
    }

    // --- 🔥 NUEVO HANDLER (Para limpiar el chat en sugerencias) ---
    if (callbackData === 'delete_message') {
      try {
        await ctx.answerCbQuery();
        await ctx.deleteMessage();
      } catch (e) {
        // No hacer nada si falla, el mensaje puede ser muy antiguo
        console.warn('No se pudo borrar el mensaje de sugerencia (quizás era muy antiguo)');
      }
      return;
    }

    // --- 🔥 NUEVOS HANDLERS (Para el flujo de teléfono) ---
    if (callbackData === 'confirm_phone_yes') {
      await ctx.answerCbQuery('Teléfono confirmado!');
      // Avanzamos al siguiente paso (pago)
      session.step = SESSION_STATES.SELECTING_PAYMENT;
      // Editamos el mensaje para preguntar por el método de pago
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
    if (callbackData.startsWith('not_')) { // 🔥 CORREGIDO: Prefijo acortado
      await handleNotificationPreference(ctx, callbackData); 
      return;
    }
    if (callbackData.startsWith('s_o_s_')) { // 🔥 CORREGIDO: Prefijo acortado
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
    
    // 🔥 AÑADIR ESTOS DOS BLOQUES
    if (callbackData.startsWith('ar_')) {
      await handleAskReceiptResponse(ctx, callbackData);
      return;
    }
    if (callbackData.startsWith('show_receipt_')) {
      await handleShowReceipt(ctx, callbackData);
      return;
    }
    // 🔥 FIN DE BLOQUES AÑADIDOS
    
    if (callbackData === 'retry_my_order') {
      await ctx.answerCbQuery();
      const myOrderHandler = require('../handlers/myOrderHandler');
      await myOrderHandler(ctx);
      return;
    }

    // --- DELEGACIÓN DE TODO EL FLUJO DE CARRITO ---
    
    if (callbackData.startsWith('add_item_')) {
      // 1. Damos feedback inmediato
      // El feedback se da dentro de handleAddItem
      
      // 2. Ejecutamos la lógica de añadir al carrito
      await cartHandler.handleAddItem(ctx, callbackData, userId, restaurantId);

      // 3. Lógica de Cross-Sell (Venta Cruzada)
      const itemId = callbackData.split('_')[2];
      const item = await menuService.getMenuItem(restaurantId, itemId);

      if (item && item.sugerir_items && item.sugerir_items.length > 0) {
        const suggestionPromises = item.sugerir_items.map(suggId => menuService.getMenuItem(restaurantId, suggId));
        const rawSuggestions = await Promise.all(suggestionPromises);
        const suggestions = rawSuggestions.filter(s => s && s.available !== false);

        if (suggestions.length > 0) {
          const suggestionButtons = suggestions.map(s => Markup.button.callback(`➕ ${s.name} ($${s.price})`, `add_item_${s.id}`));
          suggestionButtons.push(Markup.button.callback('❌ No, gracias', 'delete_message'));
          await ctx.reply(`💡 Ya que llevas *${item.name}*, quizás te interese también:`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(suggestionButtons, { columns: 1 })
          });
        }
      }

      // --- 🔥 MEJORA: Limpieza de Mensajes Residuales ---
      // Si el botón que presionamos venía de un mensaje de cross-sell,
      // borramos ese mensaje de cross-sell.
      if (messageText.includes('quizás te interese también:')) {
        try {
          await ctx.deleteMessage(); // Borra el mensaje de "quizás te interese..."
        } catch (e) { /* ... */ }
      }
      return;
    }
    if (callbackData.startsWith('item_info_')) {
      // 🔥 CORRECCIÓN: Usar el nuevo handler que edita el mensaje del menú
      const itemId = callbackData.split('_')[2];
      await showItemInfo(ctx, itemId, restaurantId);
      return;
    }
    if (callbackData === 'view_cart') {
      await cartHandler.handleViewCart(ctx, userId);
      await ctx.replyWithChatAction('typing');
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
    if (callbackData === 'continue_to_delivery') {
      await cartHandler.handleContinueToDelivery(ctx, userId, restaurantId);
      await ctx.replyWithChatAction('typing');
      return;
    }
    if (callbackData === 'delivery_yes') {
      await cartHandler.handleDeliveryYes(ctx, userId);
      return;
    }
    if (callbackData === 'pickup' || callbackData === 'change_to_pickup') {
      await cartHandler.handlePickup(ctx, userId, restaurantId);
      return;
    }
    if (callbackData.startsWith('payment_')) {
      await cartHandler.handlePaymentSelection(ctx, callbackData, userId, restaurantId);
      await ctx.replyWithChatAction('typing');
      return;
    }
    if (callbackData === 'confirm_final') {
      await cartHandler.handleFinalConfirmation(ctx, userId, restaurantId);
      return;
    }
    if (callbackData === 'cancel_order') {
      await cartHandler.handleCancelOrder(ctx, userId);
      return;
    }
    if (callbackData === 'confirm_cancel_order_action') { // Añadir este caso
      await cartHandler.handleConfirmCancelOrderAction(ctx, userId);
      return;
    }
    console.warn(`⚠️ Callback no manejado: ${callbackData}`); 
    await ctx.answerCbQuery('⚠️ Acción no reconocida'); 
    
  } catch (error) {
    console.error('❌ [interactionHandler] Error:', error);

    // 🔥 MEJORA: Manejo de error específico para conexión de Redis
    if (error.message && error.message.includes('Connection is closed')) {
      await ctx.answerCbQuery('⚠️ Problema de sesión, reintentando...', { show_alert: true }).catch(console.error);
      try {
        await ctx.reply('😔 Lo sentimos, estamos teniendo problemas técnicos. Por favor, intenta de nuevo en un momento.');
      } catch (replyError) {
        console.error('Error enviando mensaje de error de Redis:', replyError);
      }
      return; // Detener para no enviar el mensaje genérico
    }

    await ctx.answerCbQuery('❌ Hubo un error al procesar tu selección.').catch(console.error);
    try {
      await ctx.reply('❌ Ocurrió un error inesperado.\n\nPor favor intenta nuevamente o usa /start para reiniciar.');
    } catch (replyError) {
      console.error('Error enviando mensaje de error:', replyError);
    }
  }
};