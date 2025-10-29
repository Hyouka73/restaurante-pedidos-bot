// backend/src/bot/handlers/startHandler.js - ACTUALIZADO Y LIMPIO
const configBotService = require('../services/configBotService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService');
const { Markup } = require('telegraf');

module.exports = async (ctx) => {
  console.log(`[StartHandler] Recibido comando /start del usuario: ${ctx.from.id} a las ${new Date().toLocaleTimeString()}`);
  try {
    const firstName = ctx.from.first_name;
    let restaurantId = null;
    
    // --- LÓGICA DE DEEP LINKING Y OBTENCIÓN DE ID ---
    const startPayload = ctx.startPayload; // Telegraf nos da el parámetro aquí

    if (startPayload) {
      // ¡El usuario viene de un QR o un enlace! El payload es nuestro ID de restaurante.
      console.log(`[StartHandler] Deep link detectado con payload: ${startPayload}`);
      restaurantId = startPayload;
      await telegramUserService.linkChatToRestaurant(ctx.chat.id, restaurantId);
    } else {
      // El usuario escribió /start manualmente. NO se le permite continuar.
      console.log(`[StartHandler] /start manual sin payload. Acceso denegado.`);
      await ctx.reply(
        `👋 ¡Hola!\n\nPara usar este bot y hacer pedidos, necesitas escanear el código QR que se encuentra en el restaurante.\n\nEsto nos ayuda a saber exactamente desde dónde nos contactas. ¡Gracias!`,
        { reply_markup: { remove_keyboard: true } }
      );
      return; // Detener la ejecución
    }
    
    // --- El bloque 'if (!restaurantId)' se eliminó porque era redundante ---

    // Guardar info del usuario
    await telegramUserService.saveUserInfo(ctx.from, restaurantId);

    // Actualizar comandos dinámicamente
    await telegramUserService.updateUserCommands(ctx, restaurantId);

    // Obtener datos del restaurante
    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const messages = restaurantData.messages || {};
    const features = restaurantData.features || {};
    const restaurantName = restaurantData.info?.name || 'Nuestro Restaurante';

    // --- NUEVA VERIFICACIÓN: BOT HABILITADO ---
    if (features.botEnabled === false) {
      const disabledMessage = messages.botDisabled || 'El bot está temporalmente desactivado. Disculpa las molestias.';
      await ctx.reply(disabledMessage, {
        reply_markup: { remove_keyboard: true }
      });
      return; // Detener ejecución
    }
    // --- FIN DE LA VERIFICACIÓN ---

    // Verificar disponibilidad
    const availability = await availabilityService.checkAvailability(restaurantId);

    // Si no está abierto
    if (availability.status !== 'open') {
      const hours = restaurantData.hours || {};
      const now = new Date();
      const dayKey = availabilityService.getDayKey(now.getDay());
      const todayHours = hours[dayKey];

      let closedMessage = `👋 ¡Hola ${firstName}!\n\n`;
      closedMessage += `Bienvenido a *${restaurantName}* 🍽️\n\n`;
      closedMessage += `😔 Actualmente estamos *cerrados*\n\n`;

      if (availability.reason) {
        closedMessage += `📋 ${availability.reason}\n\n`;
      }

      if (todayHours && !todayHours.closed) {
        closedMessage += `⏰ *Horario de hoy:*\n`;
        closedMessage += `   Abrimos: ${todayHours.open}\n`;
        closedMessage += `   Cerramos: ${todayHours.close}`;
      }

      await ctx.reply(closedMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📋 Ver Menú', 'show_menu')],
          [Markup.button.callback('ℹ️ Información', 'show_info')]
        ])
      });
      return;
    }

    // Restaurante abierto
    const welcomeMessage = (messages.welcome || '¡Hola {nombre}! Bienvenido a {restaurante} 🍽️')
      .replace('{nombre}', firstName)
      .replace('{restaurante}', restaurantName);

      console.log(`[StartHandler] Enviando respuesta de bienvenida a ${ctx.from.id}...`);
    await ctx.reply(`${welcomeMessage}\n\n✨ Estamos *abiertos* y listos para atenderte`, {
      parse_mode: 'Markdown'
    });

    await ctx.reply(
      '👇 *¿Qué te gustaría hacer?*',
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('🛒 Hacer Pedido', 'init_order'),
            Markup.button.callback('💡 Recomendación', 'start_recommendation')
          ],
          [
            Markup.button.callback('📋 Ver Menú', 'show_menu'),
            Markup.button.callback('📞 Info', 'show_info')
          ]
        ])
      }
    );

  } catch (error) {
    console.error(`[StartHandler] 💥 Error procesando /start para ${ctx.from.id}:`, error);
    await ctx.reply(
      '❌ Hubo un error al procesar tu solicitud.\n\n' +
      'Por favor intenta nuevamente con /start'
    );
  }
};