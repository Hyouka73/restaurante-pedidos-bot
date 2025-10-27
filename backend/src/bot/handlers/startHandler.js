// backend/src/bot/handlers/startHandler.js - ACTUALIZADO
const configBotService = require('../services/configBotService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService');
const { Markup } = require('telegraf');

module.exports = async (ctx) => {
  try {
    const firstName = ctx.from.first_name;

    // 🔑 CLAVE: Usar el contexto para identificar el restaurante
    const restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);

    if (!restaurantId) {
      const botInfo = await ctx.telegram.getMe();
      console.error(`❌ No se encontró restaurante para bot @${botInfo.username}`);
      
      await ctx.reply(
        '⚠️ *Configuración Incompleta*\n\n' +
        'Este bot aún no está vinculado a un restaurante.\n\n' +
        '👨‍💼 Si eres el administrador:\n' +
        '1. Ve al panel de administración\n' +
        '2. Completa la configuración inicial\n' +
        '3. Asegúrate de guardar el token del bot\n\n' +
        `🤖 Bot ID: \
`${botInfo.id}\
`
        `📝 Username: @${botInfo.username}`,
        { 
          parse_mode: 'Markdown',
          reply_markup: { remove_keyboard: true }
        }
      );
      return;
    }

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
    // (Comprobamos 'false' explícitamente, si no existe 'botEnabled' (undefined), se asume habilitado)
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

      let closedMessage = `👋 ¡Hola ${firstName}!

`;
      closedMessage += `Bienvenido a *${restaurantName}* 🍽️

`;
      closedMessage += `😔 Actualmente estamos *cerrados*

`;

      if (availability.reason) {
        closedMessage += `📋 ${availability.reason}

`;
      }

      if (todayHours && !todayHours.closed) {
        closedMessage += `⏰ *Horario de hoy:*
`;
        closedMessage += `   Abrimos: ${todayHours.open}
`;
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
    console.error('Error en startHandler:', error);
    await ctx.reply(
      '❌ Hubo un error al procesar tu solicitud.\n\n' +
      'Por favor intenta nuevamente con /start'
    );
  }
};