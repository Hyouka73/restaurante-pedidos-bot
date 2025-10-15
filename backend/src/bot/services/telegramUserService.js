const { db } = require('../../config/firebase');

class TelegramUserService {
  // Vincular un chat de Telegram con un restaurante
  async linkChatToRestaurant(chatId, restaurantId) {
    const chatRef = db.collection('telegram_chats').doc(chatId.toString());
    await chatRef.set({
      restaurantId,
      linkedAt: new Date()
    });
    return { success: true };
  }

  // Obtener el restaurante asociado a un chat
  async getRestaurantIdByChat(chatId) {
    const chatDoc = await db.collection('telegram_chats').doc(chatId.toString()).get();
    if (!chatDoc.exists) {
      // Si no está vinculado, devolver un ID por defecto o lanzar error
      // Por ahora, usaremos un demo-restaurant
      return 'demo-restaurant';
    }
    return chatDoc.data().restaurantId;
  }
}

module.exports = new TelegramUserService();
