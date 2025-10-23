// ================================================================
// backend/src/bot/handlers/orderHandler.js - ACTUALIZADO  
// ================================================================

const menuService = require('../../services/menuService');
const orderService = require('../../services/orderService');
const telegramUserService = require('../services/telegramUserService');
const availabilityService = require('../../services/availabilityService');
const deliveryService = require('../../services/deliveryService');
const { Markup } = require('telegraf');

const userOrderSessions = new Map();

module.exports = async (ctx) => {
  try {
    const userId = ctx.from.id;

    // 🔑 Identificar restaurante desde el contexto
    const restaurantId = await telegramUserService.getRestaurantIdByBotContext(ctx);

    if (!restaurantId) {
      await ctx.reply('⚠️ No se pudo identificar el restaurante. Usa /start primero.');
      return;
    }

    // Manejar ubicación
    if (ctx.message && ctx.message.location) {
      const session = userOrderSessions.get(userId);
      if (!session) {
        await ctx.reply('No tienes un pedido activo. Inicia con /pedido');
        return;
      }

      const { latitude, longitude } = ctx.message.location;
      session.customerLocation = { latitude, longitude };

      await ctx.reply('📍 Ubicación recibida, calculando...');

      try {
        const result = await deliveryService.calculateFee(restaurantId, session.customerLocation);
        
        if (!result.withinMaxDistance) {
          await ctx.reply(
            `😔 Tu ubicación está fuera de la zona de entrega (${result.distanceKm.toFixed(2)} km)`,
            Markup.inlineKeyboard([
              [Markup.button.callback('🏪 Recoger en tienda', 'change_to_pickup')],
              [Markup.button.callback('❌ Cancelar', 'cancel_order')]
            ])
          );
          return;
        }

        session.delivery = { fee: result.fee, distanceKm: result.distanceKm };
        userOrderSessions.set(userId, session);

        await ctx.reply(
          `✅ Distancia: ${result.distanceKm.toFixed(2)} km\n` +
          `💰 Costo de envío: $${result.fee}\n\n` +
          'Envía tu dirección completa:'
        );

      } catch (err) {
        console.error('Error calculando tarifa:', err);
        await ctx.reply('❌ Error calculando envío. Intenta de nuevo.');
      }

      return;
    }

    // Manejar texto (dirección, teléfono)
    if (ctx.message && ctx.message.text && !ctx.message.text.startsWith('/')) {
      const session = userOrderSessions.get(userId);
      if (session) {
        // Procesar según el estado de la sesión
        // (implementar lógica de captura de dirección/teléfono)
      }
      return;
    }

    // Iniciar nuevo pedido
    const availability = await availabilityService.checkAvailability(restaurantId);
    if (availability.status !== 'open') {
      await ctx.reply(`😔 No podemos aceptar pedidos: ${availability.reason || 'Cerrado'}`);
      return;
    }

    const menuItems = await menuService.getMenu(restaurantId);
    if (menuItems.length === 0) {
      await ctx.reply('😔 El menú no está disponible.');
      return;
    }

    // Crear sesión
    userOrderSessions.set(userId, {
      restaurantId,
      items: [],
      step: 'selecting_item'
    });

    await ctx.reply('🛒 *¡Perfecto! Comencemos tu pedido*', { parse_mode: 'Markdown' });

    // Mostrar menú
    for (const item of menuItems) {
      const caption = `*${item.name}*\n\n${item.description || ''}\n\n💰 $${item.price}`;

      try {
        if (item.imageUrl) {
          await ctx.replyWithPhoto(item.imageUrl, {
            caption,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🛒 Agregar', `add_item_${item.id}`)]
            ])
          });
        } else {
          await ctx.reply(caption, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🛒 Agregar', `add_item_${item.id}`)]
            ])
          });
        }
      } catch (err) {
        await ctx.reply(caption, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('🛒 Agregar', `add_item_${item.id}`)]
          ])
        });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await ctx.reply(
      'Cuando termines de seleccionar:',
      Markup.inlineKeyboard([
        [Markup.button.callback('🛒 Ver Carrito', 'view_cart')],
        [Markup.button.callback('❌ Cancelar', 'cancel_order')]
      ])
    );

  } catch (error) {
    console.error('Error en orderHandler:', error);
    await ctx.reply('❌ Error al iniciar pedido.');
  }
};

module.exports.userOrderSessions = userOrderSessions;