//backend/src/bot/handlers/startHandler.js
const configBotService = require('../services/configBotService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService');
const reminderService = require('../../services/reminderService');
const notificationService = require('../services/notificationService'); // Nuevo servicio

module.exports = async (ctx) => {
  try {
    // Obtener el ID del chat de Telegram
    const chatId = ctx.chat.id;

    // Obtener el ID del restaurante asociado a este chat
    const restaurantId = await telegramUserService.getRestaurantIdByChat(chatId);

    // --- NUEVO: Verificar si es momento de enviar un recordatorio ---
    const shouldRemind = await reminderService.shouldSendOpeningReminder(restaurantId);
    if (shouldRemind) {
      console.log(`[startHandler] Enviando recordatorio para restaurante ${restaurantId}`);
      // Obtener la hora programada de apertura para el día de hoy
      const now = new Date();
      const dayKey = availabilityService.getDayKey(now.getDay());
      const restaurantDoc = await require('../../config/firebase').db.collection('restaurants').doc(restaurantId).get();
      const scheduledOpenTime = restaurantDoc.data().hours[dayKey]?.open;
      await notificationService.sendOpeningReminderToOwner(restaurantId, scheduledOpenTime);
      // No se responde al cliente aún, se continúa para verificar disponibilidad
    }
    // --- FIN NUEVO ---

    // --- VERIFICAR DISPONIBILIDAD ---
    const availability = await availabilityService.checkAvailability(restaurantId);

    if (availability.status !== 'open') {
      let messageToSend = 'Lo sentimos, no podemos aceptar pedidos en este momento.';
      if (availability.reason) {
        messageToSend += ` Motivo: ${availability.reason}`;
      }
      await ctx.reply(messageToSend);
      return; // Salir del handler si no está abierto
    }
    // --- FIN VERIFICAR DISPONIBILIDAD ---

    // Obtener los mensajes y la información del restaurante (solo si está abierto)
    const messages = await configBotService.getRestaurantMessages(restaurantId);
    const restaurantData = await configBotService.getRestaurantData(restaurantId);

    // Obtener el nombre del usuario
    const firstName = ctx.from.first_name;
    const restaurantName = restaurantData.info?.name || 'Mi Restaurante';

    // Reemplazar variables en el mensaje
    const welcomeMessage = messages.welcome
      .replace('{nombre}', firstName)
      .replace('{restaurante}', restaurantName);

    // Opcional: Enviar teclado inline con opciones iniciales
    const inlineKeyboard = [
      [
        { text: '🛒 Hacer Pedido', callback_data: 'init_order' },
        { text: '📋 Ver Menú', callback_data: 'show_menu' }
      ],
      [
        { text: '📞 Información', callback_data: 'show_info' },
        { text: '❓ Ayuda', callback_data: 'show_help' }
      ]
    ];

    await ctx.reply(welcomeMessage, {
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  } catch (error) {
    console.error('Error en startHandler:', error);
    await ctx.reply('Hubo un error al procesar tu solicitud.');
  }
};