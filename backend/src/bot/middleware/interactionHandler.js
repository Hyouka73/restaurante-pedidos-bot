const menuService = require('../../services/menuService');
const orderService = require('../../services/orderService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService'); // Importar servicio

// Para almacenar temporalmente el estado de los pedidos en sesión (simplificado)
// En producción, esto debería ir en Firestore o Redis
const userOrderSessions = new Map(); // Reutilizamos la misma del handler

module.exports = async (ctx) => {
  if (!ctx.callbackQuery) return; // Solo maneja callback queries

  const userId = ctx.from.id;
  const callbackData = ctx.callbackQuery.data;

  try {
    // Verificar si el usuario tiene una sesión activa de pedido
    let session = userOrderSessions.get(userId);
    // Manejar interacciones que NO requieren sesión de pedido (por ejemplo, ver menú desde start)
    if (!session && !callbackData.startsWith('show_menu') && !callbackData.startsWith('show_item_details')) {
      await ctx.answerCbQuery('Tu sesión de pedido ha expirado o no es válida para esta acción.', { show_alert: true });
      return;
    }

    // --- VERIFICAR DISPONIBILIDAD PARA ACCIONES DE PEDIDO ---
    // Solo verificar si la acción implica crear o modificar un pedido
    const involvesOrder = ['add_item_', 'confirm_order', 'cancel_order', 'init_order'].some(prefix => callbackData.startsWith(prefix));
    if (involvesOrder && session) { // Si hay sesión (y por tanto restaurantId)
      const availability = await availabilityService.checkAvailability(session.restaurantId);
      if (availability.status !== 'open') {
        await ctx.answerCbQuery('Lo sentimos, ya no podemos aceptar pedidos. ' + (availability.reason || ''), { show_alert: true });
        return;
      }
    }
    // --- FIN VERIFICAR DISPONIBILIDAD ---

    if (callbackData.startsWith('add_item_')) {
      const itemId = callbackData.split('_')[2];
      const restaurantId = session.restaurantId; // De la sesión

      // Obtener el item del menú
      const menuItems = await menuService.getMenu(restaurantId);
      const item = menuItems.find(i => i.id === itemId);

      if (!item) {
        await ctx.answerCbQuery('El platillo ya no está disponible.', { show_alert: true });
        return;
      }

      // Agregar item al pedido en sesión
      session.items.push({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1 // Por defecto, 1
      });

      // Actualizar sesión
      userOrderSessions.set(userId, session);

      // Actualizar mensaje con el carrito
      let cartMessage = '🛒 *Tu Pedido:*\n\n';
      session.items.forEach((item, index) => {
        cartMessage += `${index + 1}. ${item.name} - $${item.price}\n`;
      });
      cartMessage += `\n*Total: $${session.items.reduce((sum, item) => sum + item.price, 0)}*`;

      // Botones: Añadir más, Confirmar, Cancelar
      const inlineKeyboard = [
        [
          { text: '➕ Añadir más', callback_data: 'show_menu_again' },
          { text: '✅ Confirmar', callback_data: 'confirm_order' }
        ],
        [
          { text: '❌ Cancelar', callback_data: 'cancel_order' }
        ]
      ];

      await ctx.editMessageText(cartMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      });

      await ctx.answerCbQuery(); // Responder para quitar el spinner
    } else if (callbackData === 'show_menu_again') {
      // Volver a mostrar el menú para añadir más items
      const restaurantId = session.restaurantId; // De la sesión
      const menuItems = await menuService.getMenu(restaurantId);

      if (menuItems.length === 0) {
        await ctx.answerCbQuery('No hay items en el menú.', { show_alert: true });
        return;
      }

      const menuMessage = '🛒 *Selecciona un platillo para agregar al pedido:*\n\n';
      let inlineKeyboard = [];

      menuItems.forEach((item, index) => {
        if (index % 2 === 0) {
          inlineKeyboard.push([]);
        }
        const currentRow = inlineKeyboard[inlineKeyboard.length - 1];
        currentRow.push({
          text: item.name,
          callback_data: `add_item_${item.id}`
        });
      });

      await ctx.editMessageText(menuMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: inlineKeyboard
        }
      });

      await ctx.answerCbQuery();
    } else if (callbackData === 'confirm_order') {
      // Confirmar y crear el pedido en Firestore
      if (session.items.length === 0) {
        await ctx.answerCbQuery('Tu carrito está vacío.', { show_alert: true });
        return;
      }

      const customerInfo = {
        name: ctx.from.first_name,
        telegramId: ctx.from.id,
      };

      const orderData = {
        customer: customerInfo,
        items: session.items,
        total: session.items.reduce((sum, item) => sum + item.price, 0),
        channel: 'telegram' // O 'local', 'web', etc.
      };

      const order = await orderService.createOrder(session.restaurantId, orderData); // Usar restaurantId de la sesión

      // Enviar mensaje de confirmación
      await ctx.editMessageText(`✅ *Pedido confirmado!*\n\nNúmero de pedido: *#${order.id}*\nTotal: *$${order.total}*`, {
        parse_mode: 'Markdown'
      });

      // Limpiar sesión
      userOrderSessions.delete(userId);

      await ctx.answerCbQuery();
    } else if (callbackData === 'cancel_order') {
      await ctx.editMessageText('❌ Pedido cancelado.');
      userOrderSessions.delete(userId);
      await ctx.answerCbQuery();
    }
    // Puedes añadir más else if para otras interacciones como 'show_menu', 'show_info', etc.
    else if (callbackData === 'show_menu') {
       // Reutilizar la lógica del menuHandler
       const chatId = ctx.chat.id;
       const restaurantId = await telegramUserService.getRestaurantIdByChat(chatId);
       // Verificar disponibilidad aquí también si es necesario, o asumir que si llegó acá, está abierto
       const menuItems = await menuService.getMenu(restaurantId);

       if (menuItems.length === 0) {
         await ctx.answerCbQuery('No hay items en el menú.', { show_alert: true });
         return;
       }

       let menuMessageText = '🛒 *Selecciona un platillo:*\n\n';
       let inlineKeyboard = [];

       menuItems.forEach((item, index) => {
         if (index % 2 === 0) {
           inlineKeyboard.push([]);
         }
         const currentRow = inlineKeyboard[inlineKeyboard.length - 1];
         currentRow.push({
           text: item.name,
           callback_data: `add_item_${item.id}` // Directamente agregar al pedido
         });
       });

       await ctx.editMessageText(menuMessageText, {
         parse_mode: 'Markdown',
         reply_markup: {
           inline_keyboard: inlineKeyboard
         }
       });
       await ctx.answerCbQuery();
     }
     // ... más else if para 'show_info', 'show_help', etc ...

  } catch (error) {
    console.error('Error en interactionHandler:', error);
    await ctx.answerCbQuery('Hubo un error al procesar tu selección.');
  }
};