//backend/src/bot/services/telegramUserService.js
const { db } = require('../../config/firebase');
const cryptoUtils = require('../../utils/crypto');

class TelegramUserService {
  
  /**
   * Vincular un chat de Telegram con un restaurante
   * @param {string|number} chatId - ID del chat de Telegram
   * @param {string} restaurantId - ID del restaurante en Firestore
   */
  async linkChatToRestaurant(chatId, restaurantId) {
    try {
      const chatRef = db.collection('telegram_chats').doc(chatId.toString());
      await chatRef.set({
        restaurantId,
        linkedAt: new Date(),
        lastInteraction: new Date()
      }, { merge: true });
      
      console.log(`✅ Chat ${chatId} vinculado a restaurante ${restaurantId}`);
      return { success: true };
    } catch (error) {
      console.error(`Error vinculando chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Obtener el restaurante asociado a un chat USANDO EL BOT INFO
   * La clave está en usar el botInfo del contexto de Telegraf
   * @param {object} ctx - Contexto de Telegraf
   * @returns {string|null} - ID del restaurante o null
   */
  async getRestaurantIdByBotContext(ctx) {
    try {
      const chatId = ctx.chat.id;
      
      // 1. Intentar obtener desde caché/vínculo existente
      const chatDoc = await db.collection('telegram_chats').doc(chatId.toString()).get();
      
      if (chatDoc.exists) {
        // Actualizar última interacción
        await chatDoc.ref.update({
          lastInteraction: new Date()
        });
        
        const restaurantId = chatDoc.data().restaurantId;
        console.log(`✅ Chat ${chatId} ya vinculado a restaurante ${restaurantId}`);
        return restaurantId;
      }

      // 2. No hay vínculo - Identificar restaurante por el BOT que están usando
      const botInfo = await ctx.telegram.getMe();
      const botId = botInfo.id;
      const botUsername = botInfo.username;
      
      console.log(`🔍 Buscando restaurante para bot: @${botUsername} (ID: ${botId})`);
      
      // Buscar restaurante que tenga este bot
      const restaurantId = await this.findRestaurantByBotId(botId);
      
      if (restaurantId) {
        // Auto-vincular
        await this.linkChatToRestaurant(chatId, restaurantId);
        console.log(`✅ Chat ${chatId} auto-vinculado a restaurante ${restaurantId}`);
        return restaurantId;
      }

      // 3. No encontrado - último recurso: buscar por hash del token
      console.warn(`⚠️ No se encontró restaurante por botId. Intentando por token...`);
      const restaurantByToken = await this.findRestaurantByCurrentToken(ctx);
      
      if (restaurantByToken) {
        await this.linkChatToRestaurant(chatId, restaurantByToken);
        console.log(`✅ Chat ${chatId} vinculado a restaurante ${restaurantByToken} (por token)`);
        return restaurantByToken;
      }

      console.error(`❌ No se encontró restaurante para bot @${botUsername}`);
      return null;

    } catch (error) {
      console.error(`Error obteniendo restaurante para chat:`, error);
      return null;
    }
  }

  /**
   * Buscar restaurante por ID del bot de Telegram
   * @param {number} botId - ID del bot de Telegram
   * @returns {string|null}
   */
  async findRestaurantByBotId(botId) {
    try {
      // Opción 1: Buscar en campo dedicado (recomendado)
      const restaurantsSnapshot = await db.collection('restaurants')
        .where('info.telegramBotId', '==', botId)
        .limit(1)
        .get();

      if (!restaurantsSnapshot.empty) {
        return restaurantsSnapshot.docs[0].id;
      }

      // Opción 2: Buscar en todos los restaurantes (menos eficiente pero funcional)
      const allRestaurants = await db.collection('restaurants')
        .where('setupCompleted', '==', true)
        .get();

      for (const doc of allRestaurants.docs) {
        const data = doc.data();
        const encryptedToken = data?.info?.telegramToken;
        
        if (!encryptedToken) continue;

        try {
          const token = cryptoUtils.decryptToken(encryptedToken);
          
          // Obtener bot info con este token para comparar
          const { Telegraf } = require('telegraf');
          const testBot = new Telegraf(token);
          const testBotInfo = await testBot.telegram.getMe();
          
          if (testBotInfo.id === botId) {
            // Guardar el botId para futuras búsquedas más rápidas
            await doc.ref.update({
              'info.telegramBotId': botId,
              'info.telegramBotUsername': testBotInfo.username
            });
            
            return doc.id;
          }
        } catch (tokenError) {
          console.error(`Error verificando token para restaurante ${doc.id}:`, tokenError);
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Error buscando restaurante por botId:', error);
      return null;
    }
  }

  /**
   * Buscar restaurante usando el token del contexto actual
   * (Método de respaldo cuando no se puede usar botId)
   * @param {object} ctx - Contexto de Telegraf
   * @returns {string|null}
   */
  async findRestaurantByCurrentToken(ctx) {
    try {
      // Obtener el token del bot actual desde el proceso
      const currentToken = process.env.TELEGRAM_BOT_TOKEN;
      
      if (!currentToken) {
        console.error('❌ TELEGRAM_BOT_TOKEN no está en el entorno');
        return null;
      }

      // Crear hash del token para comparar
      const currentHash = cryptoUtils.hmacToken(currentToken);

      // Buscar restaurante con este hash
      const restaurantsSnapshot = await db.collection('restaurants')
        .where('info.telegramTokenHash', '==', currentHash)
        .limit(1)
        .get();

      if (!restaurantsSnapshot.empty) {
        return restaurantsSnapshot.docs[0].id;
      }

      return null;
    } catch (error) {
      console.error('Error buscando restaurante por token:', error);
      return null;
    }
  }

  /**
   * Método de compatibilidad (deprecado)
   * @deprecated Usar getRestaurantIdByBotContext en su lugar
   */
  async getRestaurantIdByChat(chatId) {
    console.warn('⚠️ getRestaurantIdByChat está deprecado. Usa getRestaurantIdByBotContext con contexto.');
    
    const chatDoc = await db.collection('telegram_chats').doc(chatId.toString()).get();
    
    if (chatDoc.exists) {
      return chatDoc.data().restaurantId;
    }
    
    return null;
  }

  /**
   * Desvincular un chat de su restaurante
   * @param {string|number} chatId - ID del chat
   */
  async unlinkChat(chatId) {
    try {
      await db.collection('telegram_chats').doc(chatId.toString()).delete();
      console.log(`✅ Chat ${chatId} desvinculado`);
      return { success: true };
    } catch (error) {
      console.error(`Error desvinculando chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Obtener todos los chats vinculados a un restaurante
   * @param {string} restaurantId - ID del restaurante
   * @returns {Array} - Lista de chat IDs
   */
  async getChatsByRestaurant(restaurantId) {
    try {
      const chatsSnapshot = await db.collection('telegram_chats')
        .where('restaurantId', '==', restaurantId)
        .get();

      const chats = [];
      chatsSnapshot.forEach(doc => {
        chats.push({
          chatId: doc.id,
          ...doc.data()
        });
      });

      return chats;
    } catch (error) {
      console.error(`Error obteniendo chats para restaurante ${restaurantId}:`, error);
      return [];
    }
  }

  /**
   * Guardar información del usuario de Telegram
   * @param {object} telegramUser - Objeto de usuario de Telegram
   * @param {string} restaurantId - ID del restaurante
   */
  async saveUserInfo(telegramUser, restaurantId) {
    try {
      const userRef = db.collection('telegram_users').doc(telegramUser.id.toString());
      
      const existingDoc = await userRef.get();
      
      await userRef.set({
        telegramId: telegramUser.id,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name || null,
        username: telegramUser.username || null,
        languageCode: telegramUser.language_code || null,
        restaurantId,
        lastInteraction: new Date(),
        createdAt: existingDoc.exists ? existingDoc.data().createdAt : new Date()
      }, { merge: true });

      console.log(`✅ Info de usuario ${telegramUser.id} guardada`);
      return { success: true };
    } catch (error) {
      console.error(`Error guardando info de usuario:`, error);
      throw error;
    }
  }

  /**
   * Obtener información de un usuario de Telegram
   * @param {string|number} telegramId - ID del usuario en Telegram
   */
  async getUserInfo(telegramId) {
    try {
      const userDoc = await db.collection('telegram_users').doc(telegramId.toString()).get();
      
      if (userDoc.exists) {
        return userDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error(`Error obteniendo info de usuario ${telegramId}:`, error);
      return null;
    }
  }
}

module.exports = new TelegramUserService();