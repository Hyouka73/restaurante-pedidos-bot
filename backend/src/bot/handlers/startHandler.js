// backend/src/bot/handlers/startHandler.js
const configBotService = require('../services/configBotService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService');
const { Markup } = require('telegraf');

module.exports = async (ctx) => {
  console.log(`[StartHandler] Recibido comando /start del usuario: ${ctx.from.id} a las ${new Date().toLocaleTimeString()}`);
  // 🔥 AÑADIDO: Mostrar "escribiendo..." para feedback inmediato
  await ctx.replyWithChatAction('typing');

  try {
    const firstName = ctx.from.first_name;
    let restaurantId = null;
    
    // --- LÓGICA DEEP LINKING Y COMPROBACIÓN DE USUARIO ---
    
    // 1. Buscar el payload (Prioridad #1: Usuario nuevo o escaneo de QR)
    const startPayload = ctx.startPayload || ctx.payload;

    if (startPayload) {
      // ¡Viene de un QR! Esta es la prioridad.
      console.log(`[StartHandler] Deep link detectado con payload: ${startPayload}`);
      restaurantId = startPayload;

      // Guardar en la SESIÓN (para acceso inmediato)
      if (!ctx.session) { ctx.session = {}; }
      ctx.session.restaurantId = restaurantId;
      console.log(`[StartHandler] restaurantId ${restaurantId} guardado en la sesión.`);

      // Guardar en la DB (vinculación persistente)
      await telegramUserService.linkChatToRestaurant(ctx.chat.id, restaurantId);

    } else {
      // No hay payload (/start manual). ¿Ya conocemos a este usuario?
      
      // 2. Revisar la sesión (Prioridad #2: Usuario existente activo)
      restaurantId = ctx.session?.restaurantId;
      
      if (restaurantId) {
         console.log(`[StartHandler] Usuario existente. ID ${restaurantId} encontrado en la SESIÓN.`);
      } else {
        // 3. Revisar la DB (Prioridad #3: Usuario existente con sesión expirada)
        console.log(`[StartHandler] No hay payload ni ID en sesión. Consultando DB...`);
        
        // Esta es la nueva función que creaste en telegramUserService
        restaurantId = await telegramUserService.getRestaurantIdByChatId(ctx.chat.id);
        
        if (restaurantId) {
          console.log(`[StartHandler] Usuario existente. ID ${restaurantId} encontrado en la DB.`);
          // Si lo encontramos en la DB, lo guardamos en la sesión para la próxima
          if (!ctx.session) { ctx.session = {}; }
          ctx.session.restaurantId = restaurantId;
        } else {
          console.log(`[StartHandler] Usuario no encontrado en DB.`);
        }
      }
    }
    
    // --- VERIFICACIÓN FINAL ---
    if (!restaurantId) {
      // FRACASO: No hay payload, ni sesión, ni DB. Ahora sí, acceso denegado.
      console.log(`[StartHandler] /start manual sin payload Y sin registro. Acceso denegado.`);
      await ctx.reply(
        `👋 ¡Hola!\n\nPara usar este bot y hacer pedidos, necesitas escanear el código QR que se encuentra en el restaurante.\n\nEsto nos ayuda a saber exactamente desde dónde nos contactas. ¡Gracias!`,
        { reply_markup: { remove_keyboard: true } }
      );
      return; // Detener la ejecución
    }

    // --- ÉXITO: SI LLEGAMOS AQUÍ, SÍ TENEMOS UN restaurantId ---
    console.log(`[StartHandler] Procediendo con restaurantId: ${restaurantId}`);

    // 🔥 NUEVO: Guardar en ctx.state para el resto del ciclo de vida de la solicitud
    ctx.state.restaurantId = restaurantId;

    // Guardar info del usuario (actualiza la 'lastInteraction')
    await telegramUserService.saveUserInfo(ctx.from, restaurantId);

    // Actualizar comandos dinámicamente
    await telegramUserService.updateUserCommands(ctx, restaurantId);

    // Obtener datos del restaurante
    const restaurantData = await configBotService.getRestaurantData(restaurantId);
    const messages = restaurantData.messages || {};
    const features = restaurantData.features || {};
    const restaurantName = restaurantData.info?.name || 'Nuestro Restaurante';

    // --- VERIFICACIÓN: BOT HABILITADO ---
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
    
    // Combinamos los dos 'reply' en uno solo
    await ctx.reply(
      `${welcomeMessage}\n\n` +
      `✨ Estamos *abiertos* y listos para atenderte.\n\n` +
      `👇 *¿Qué te gustaría hacer?*`,
      {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true }, // Aseguramos limpiar teclado
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📋 Ver Menú Completo', 'show_menu')],
          [Markup.button.callback('💡 ¡Ayúdame a descubrir!', 'start_recommendation')],
          [Markup.button.callback('📞 Info del Restaurante', 'show_info')]
        ])
      }
    );

  } catch (error) {
    console.error(`[StartHandler] 💥 Error procesando /start para ${ctx.from.id}:`, error);
    View `telegramUserService.js`
    await ctx.reply(
      '❌ Hubo un error al procesar tu solicitud.\n\n' +
      'Por favor intenta nuevamente con /start'
    );
  }
};