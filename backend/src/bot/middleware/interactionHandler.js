// backend/src/bot/middleware/interactionHandler.js

const telegramUserService = require('../services/telegramUserService');
const configBotService = require('../services/configBotService');
const availabilityService = require('../../services/availabilityService');
const { Markup } = require('telegraf');
const { userOrderSessions } = require('../handlers/orderHandler');

// Importar todos los handlers especializados
const cartHandler = require('../handlers/cartHandler');
const { showMenuView } = require('../handlers/menuHandler');
const { handleRecommendation } = require('../handlers/recommendationHandler');
const { handleComboBuilder } = require('../handlers/comboBuilderHandler');
// Importar las funciones del nuevo handler de notificaciones
const { handleNotificationPreference, handleShowOrderStatus } = require('../handlers/notificationHandler');


module.exports = async (ctx) => {
  // Solo procesar callbacks de botones
  if (!ctx.callbackQuery) return;

  const userId = ctx.from.id;
  const callbackData = ctx.callbackQuery.data;
  
  try {
    // Obtener la sesión de pedido del usuario (si existe)
    let session = userOrderSessions.get(userId);
    
    // Obtener el ID del restaurante (desde la sesión o identificando el bot)
    const restaurantId = session?.restaurantId || await telegramUserService.getRestaurantIdByBotContext(ctx);
    if (!restaurantId) {
      await ctx.answerCbQuery('⚠️ No se pudo identificar el restaurante. Usa /start primero.', { show_alert: true });
      return;
    }

    // Cargar datos y configuraciones del restaurante
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
        'continue_to_delivery', 'delivery_', 'pickup', 'payment_', 'confirm_final'
    ];
    const involvesOrder = orderActions.some(prefix => callbackData.startsWith(prefix));
    
    if (involvesOrder) {
      const availability = await availabilityService.checkAvailability(restaurantId);
      if (availability.status !== 'open') {
        await ctx.answerCbQuery('😔 Lo sentimos, ya no podemos aceptar pedidos. ' + (availability.reason || ''), { show_alert: true });
        return;
      }
    }

    // --- 3. DELEGACIÓN DE LÓGICA POR CALLBACK ---

    // Flujo de Recomendación
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
      await showMenuView(ctx, 1, true); // Mostrar menú (pag 1, editando mensaje)
      return;
    }
    if (callbackData.startsWith('menu_page_')) {
      const page = parseInt(callbackData.split('_')[2], 10);
      await showMenuView(ctx, page, true); // Cambiar página del menú
      return;
    }
     if (callbackData === 'show_info') {
      await ctx.answerCbQuery();
      const info = restaurantData.info || {};
      const hours = restaurantData.hours || {};
      let infoMessage = `ℹ️ *Información del Restaurante*\n\n`;
      infoMessage += `🏪 *${info.name || 'Restaurante'}*\n\n`;
      if (info.description) infoMessage += `📝 ${info.description}\n\n`;
      if (info.address) infoMessage += `📍 *Dirección:*\n${info.address}\n\n`;
      if (info.phone) infoMessage += `📞 *Teléfono:* ${info.phone}\n\n`;
      
      infoMessage += `⏰ *Horarios:*\n`;
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      dayKeys.forEach((key, index) => {
        const dayHours = hours[key];
        if (dayHours) {
          infoMessage += `   ${days[index]}: ${dayHours.closed ? 'Cerrado' : `${dayHours.open} - ${dayHours.close}`}\n`;
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

    // Flujo de Notificaciones y Estado de Pedido
    if (callbackData.startsWith('notify_')) {
      await handleNotificationPreference(ctx, callbackData);
      return;
    }
    if (callbackData.startsWith('show_order_status_')) {
      await handleShowOrderStatus(ctx, callbackData);
      return;
    }

    // --- DELEGACIÓN DE TODO EL FLUJO DE CARRITO ---
    // (Todas estas funciones están en cartHandler.js)
    
    if (callbackData.startsWith('add_item_')) {
      await cartHandler.handleAddItem(ctx, callbackData, userId, session, restaurantId);
      return;
    }
    if (callbackData.startsWith('item_info_')) {
      await cartHandler.handleItemInfo(ctx, callbackData, restaurantId);
      return;
    }
    if (callbackData === 'view_cart') {
      await cartHandler.handleViewCart(ctx, userId, session);
      return;
    }
    if (callbackData.startsWith('qty_')) {
      await cartHandler.handleQuantityChange(ctx, callbackData, userId, session, restaurantId);
      return;
    }
    if (callbackData.startsWith('remove_')) {
      await cartHandler.handleRemoveItem(ctx, callbackData, userId, session, restaurantId);
      return;
    }
    if (callbackData === 'continue_to_delivery') {
      await cartHandler.handleContinueToDelivery(ctx, userId, session, restaurantId);
      return;
    }
    if (callbackData === 'delivery_yes') {
      await cartHandler.handleDeliveryYes(ctx, userId, session);
      return;
    }
    if (callbackData === 'pickup' || callbackData === 'change_to_pickup') {
      await cartHandler.handlePickup(ctx, userId, session, restaurantId);
      return;
    }
    if (callbackData.startsWith('payment_')) {
      await cartHandler.handlePaymentSelection(ctx, callbackData, userId, session, restaurantId);
      return;
    }
    if (callbackData === 'confirm_final') {
      await cartHandler.handleFinalConfirmation(ctx, userId, session, restaurantId);
      return;
    }
    if (callbackData === 'cancel_order') {
      await cartHandler.handleCancelOrder(ctx, userId);
      return;
    }

    // --- 4. Fallback ---
    console.warn(`⚠️ Callback no manejado: ${callbackData}`);
    await ctx.answerCbQuery('⚠️ Acción no reconocida');
    
  } catch (error) {
    // --- 5. Manejo de Errores General ---
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