//backend/src/bot/services/telegramUserService.js
const { db } = require('../../config/firebase');

class TelegramUserService {
  // Vincular un chat de Telegram con un restaurante
  // Por ahora, asumimos un vínculo 1:1 fijo o basado en lógica externa
  // Este ejemplo usa un ID fijo para demostración, debería ser dinámico
  async linkChatToRestaurant(chatId, restaurantId) {
    const chatRef = db.collection('telegram_chats').doc(chatId.toString());
    await chatRef.set({
      restaurantId,
      linkedAt: new Date()
    });
    return { success: true };
  }

  // Obtener el restaurante asociado a un chat
  // Por ahora, devolver un ID fijo o lanzar error si no está vinculado
  // En la realidad, aquí se buscaría el vínculo en la DB
  async getRestaurantIdByChat(chatId) {
    const chatDoc = await db.collection('telegram_chats').doc(chatId.toString()).get();
    if (!chatDoc.exists) {
      // Si no está vinculado, devolver un ID por defecto o lanzar error
      // Por ejemplo, podrías tener un "restaurante demo" o forzar el vínculo
      // Por ahora, asumiremos un restaurante demo con ID conocido
      // En un sistema real, aquí se implementaría la lógica de vinculación
      console.log(`[telegramUserService] Chat ${chatId} no vinculado, usando demo-restaurant`);
      return 'demo-restaurant'; // O lanzar un error para forzar la creación/enlace
    }
    return chatDoc.data().restaurantId;
  }
}

module.exports = new TelegramUserService();