// backend/src/bot/handlers/myOrderHandler.js
const orderService = require('../../services/orderService');
const myOrderKeyboards = require('../keyboards/myOrderKeyboards');

const mainMyOrderHandler = async (ctx) => {
    try {
        const userId = ctx.from.id;
        await ctx.replyWithChatAction('typing');

        const activeOrders = await orderService.getAllActiveOrdersByUser(userId);

        if (!activeOrders || activeOrders.length === 0) {
            const { message, keyboard } = myOrderKeyboards.getNoActiveOrdersMessage();
            await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
            return;
        }

        if (activeOrders.length === 1) {
            const order = activeOrders[0];
            const { message, keyboard } = myOrderKeyboards.getSingleOrderMessage(order);
            await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
            return;
        }

        const { message, keyboard } = myOrderKeyboards.getMultipleOrdersMessage(activeOrders);
        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });

    } catch (error) {
        console.error('Error en myOrderHandler:', error);
        const { message, keyboard } = myOrderKeyboards.getErrorMessage();
        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }
};

module.exports = mainMyOrderHandler;
module.exports.formatOrderStatus = myOrderKeyboards.formatOrderStatus;