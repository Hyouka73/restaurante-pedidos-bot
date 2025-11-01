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

const { showMenuView } = require('../handlers/menuHandler');
const { handleRecommendation } = require('../handlers/recommendationHandler');
const { handleComboBuilder } = require('../handlers/comboBuilderHandler');
// Importar las funciones del nuevo handler de notificaciones
const { 
  handleNotificationPreference, 
  handleShowOrderStatus,
  handleRefreshOrderStatus,      // NUEVO
  handleCancelOrderRequest,       // NUEVO
  handleConfirmCancelOrder        // NUEVO
} = require('../handlers/notificationHandler');

// --- NUEVA IMPORTACIÓN ---
// Importamos toda la lógica del carrito desde el archivo refactorizado
const cartHandler = require('../handlers/cartHandler');

module.exports = async (ctx) => {
  // Solo procesar callbacks de botones
  if (!ctx.callbackQuery) return; 
  
  const userId = ctx.from.id; 
  const callbackData = ctx.callbackQuery.data; 
  try {
    const session = ctx.session?.cart;
    const restaurantId = session?.restaurantId ||
      await telegramUserService.getRestaurantIdByBotContext(ctx); 
      
    if (!restaurantId) {
      await ctx.answerCbQuery('⚠️ No se pudo identificar el restaurante. Usa /start primero.', { show_alert: true }); 
      return; 
    }
    
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
    
    if (callbackData === 'show_menu' || callbackData === 'back_to_menu') {
      await ctx.answerCbQuery(); 
      await showMenuView(ctx, 1, false); // 'isEdit = false' para enviar un mensaje nuevo y limpio
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
    if (callbackData === 'back_to_start') {
      await ctx.answerCbQuery(); 
      const startHandler = require('../handlers/startHandler'); // Cargar solo al necesitar
      await startHandler(ctx); 
      return;
    }

    // --- 🔥 NUEVO HANDLER (Para limpiar el chat) ---
    if (callbackData === 'delete_message') {
      try {
        await ctx.deleteMessage();
      } catch (e) {
        console.warn('No se pudo borrar el mensaje (quizás era muy antiguo)');
      }
      return;
    }

    // --- 🔥 NUEVOS HANDLERS (Para el flujo de teléfono) ---
    if (callbackData === 'confirm_phone_yes') {
      await ctx.answerCbQuery('Teléfono confirmado');
      const userInfo = await telegramUserService.getUserInfo(userId);
      // Guardamos el teléfono en la sesión por si acaso
      session.customerPhone = session.customerPhone || userInfo?.phone;
      
      // Borramos el mensaje de botones
      await ctx.editMessageReplyMarkup(null);

      // Avanzamos al siguiente paso (pago)
      session.step = SESSION_STATES.SELECTING_PAYMENT;
      await askPaymentMethod(ctx, session, restaurantId);
      return;
    }
    
    if (callbackData === 'confirm_phone_no') {
      await ctx.answerCbQuery('Ingresa un nuevo número');
      // Borramos el mensaje de botones
      await ctx.editMessageReplyMarkup(null);
      
      // Llamamos a la función, que ahora sabe que no hay teléfono y pedirá uno
      await askForPhone(ctx, session, null, restaurantId); // Pasamos userInfo como 'null' para forzar la pregunta
      return;
    }

    // --- HANDLERS DE NOTIFICACIÓN DE PEDIDO ---
    if (callbackData.startsWith('notify_')) {
      await handleNotificationPreference(ctx, callbackData); 
      return;
    }
    if (callbackData.startsWith('show_order_status_')) {
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
    if (callbackData === 'retry_my_order') {
      await ctx.answerCbQuery();
      const myOrderHandler = require('../handlers/myOrderHandler');
      await myOrderHandler(ctx);
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

    // --- DELEGACIÓN DE TODO EL FLUJO DE CARRITO ---
    
    if (callbackData.startsWith('add_item_')) {
      await cartHandler.handleAddItem(ctx, callbackData, userId, restaurantId);
      return;
    }
    if (callbackData.startsWith('item_info_')) {
      await cartHandler.handleItemInfo(ctx, callbackData, restaurantId);
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
    if (callbackData === 'continue_to_delivery') {
      await cartHandler.handleContinueToDelivery(ctx, userId, restaurantId);
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
    console.warn(`⚠️ Callback no manejado: ${callbackData}`); 
    await ctx.answerCbQuery('⚠️ Acción no reconocida'); 
    
  } catch (error) {
    console.error('❌ [interactionHandler] Error:', error); 
    await ctx.answerCbQuery('❌ Hubo un error al procesar tu selección.').catch(console.error); 
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