//backend/src/bot/handlers/orderHandler.js
const menuService = require('../../services/menuService');
const orderService = require('../../services/orderService');
const configBotService = require('../services/configBotService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService'); // Importar servicio
const deliveryService = require('../../services/deliveryService');

// Para almacenar temporalmente el estado de los pedidos en sesión (simplificado)
// En producción, esto debería ir en Firestore o Redis
const userOrderSessions = new Map();

module.exports = async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const restaurantId = await telegramUserService.getRestaurantIdByChat(chatId);

    // Manejo de mensaje de ubicación enviado por el usuario
    if (ctx.message && ctx.message.location) {
      const session = userOrderSessions.get(userId);
      if (!session) {
        await ctx.reply('No tienes un pedido activo. Inicia un pedido primero con /pedido o "Hacer Pedido".');
        return;
      }

      const { latitude, longitude } = ctx.message.location;
      session.customerLocation = { latitude, longitude };
      userOrderSessions.set(userId, session);

      // Calcular tarifa
      try {
        const result = await deliveryService.calculateFee(session.restaurantId, session.customerLocation);
        if (!result.withinMaxDistance) {
          await ctx.reply('Lo sentimos, tu ubicación está fuera de la zona de entrega.');
          return;
        }

        session.delivery = { fee: result.fee, distanceKm: result.distanceKm };
        userOrderSessions.set(userId, session);

        await ctx.reply(`La distancia hasta el local es de ${result.distanceKm} km. Tarifa estimada: $${result.fee}. \nEnvía /confirmar para continuar con el pedido o /cancelar para cancelar.`);
      } catch (err) {
        console.error('Error calculando tarifa:', err);
        await ctx.reply('Error calculando tarifa de envío. Intenta nuevamente más tarde.');
      }

      return; // manejado el mensaje de ubicación
    }

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

    // Obtener el menú
    const menuItems = await menuService.getMenu(restaurantId);

    if (menuItems.length === 0) {
      await ctx.reply('Lo sentimos, el menú aún no está disponible.');
      return;
    }

    // Iniciar sesión de pedido para este usuario
    userOrderSessions.set(userId, {
      restaurantId,
      items: [],
      step: 'selecting_item' // Posibles: selecting_item, confirming
    });

    // Enviar menú con botones inline para seleccionar items
    const menuMessage = '🛒 *Selecciona un platillo para agregar al pedido:*\n\n';
    let inlineKeyboard = [];

    menuItems.forEach((item, index) => {
      // Creamos botones por fila (2 por fila es común)
      if (index % 2 === 0) {
        inlineKeyboard.push([]);
      }
      const currentRow = inlineKeyboard[inlineKeyboard.length - 1];
      currentRow.push({
        text: item.name,
        callback_data: `add_item_${item.id}`
      });
    });

    await ctx.reply(menuMessage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });

  } catch (error) {
    console.error('Error en orderHandler:', error);
    await ctx.reply('Hubo un error al iniciar tu pedido.');
  }
};