// backend/src/services/configService.js
const { db } = require('../config/firebase');

class ConfigService {

  // Obtener configuración general del restaurante (info, horarios, etc.)
  async getRestaurantConfig(restaurantId) {
    const doc = await db.collection('restaurants').doc(restaurantId).get();
    if (!doc.exists) {
      throw new Error('Restaurant not found');
    }
    // ✅ CORRECCIÓN: Incluir el ID en la respuesta
    return { id: doc.id, ...doc.data() };
  }

  // Obtener solo la información general
  async getGeneralInfo(restaurantId) {
    const config = await this.getRestaurantConfig(restaurantId);
    const { info, hours, availabilitySettings, availability, delivery, paymentMethods, features, commands, setupCompleted } = config;
    
    // ✅ CORRECCIÓN CRÍTICA: Siempre incluir el ID explícitamente
    // El ID del documento de Firestore ES el restaurantId (que es el uid del usuario)
    return { 
      id: restaurantId, // ✅ ESTO ES LO MÁS IMPORTANTE
      info, 
      hours, 
      availabilitySettings, 
      availability,
      delivery, 
      paymentMethods, 
      features, 
      commands,
      setupCompleted
    };
  }

  // Actualizar información general
  async updateGeneralInfo(restaurantId, updateData) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      ...updateData,
      updatedAt: new Date()
    });

    const updatedDoc = await restaurantRef.get();
    const data = updatedDoc.exists ? updatedDoc.data() : {};
    const { info, hours, availabilitySettings, availability, delivery, paymentMethods, features, commands } = data;
    
    // ✅ CORRECCIÓN: Incluir el ID en la respuesta
    return { 
      id: restaurantId, 
      info, 
      hours, 
      availabilitySettings, 
      availability,
      delivery, 
      paymentMethods, 
      features, 
      commands 
    };
  }

  // Método específico para actualizar solo el token de Telegram
  /*
  async updateTelegramToken(restaurantId, newToken) {
    const cryptoUtils = require('../utils/crypto');
    const encrypted = cryptoUtils.encryptToken(newToken);
    const hashed = cryptoUtils.hmacToken(newToken);
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'info.telegramToken': encrypted,
      'info.telegramTokenHash': hashed,
      updatedAt: new Date()
    });
    return { success: true };
  }
  */

  // Método para marcar la configuración como completada
  async markSetupAsCompleted(restaurantId) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      setupCompleted: true,
      updatedAt: new Date()
    });
    return { success: true };
  }

  // --- MÉTODOS PARA HABILITAR/DESHABILITAR BOT ---
  async enableBot(restaurantId) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'features.botEnabled': true,
      updatedAt: new Date()
    });
    return { success: true, enabled: true };
  }

  async disableBot(restaurantId) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'features.botEnabled': false,
      updatedAt: new Date()
    });
    return { success: true, enabled: false };
  }

  // --- MÉTODOS EXISTENTES ---
  async updateMessages(restaurantId, messages) {
    await db.collection('restaurants').doc(restaurantId).update({
      messages,
      updatedAt: new Date()
    });
    return { success: true };
  }

  async getMessages(restaurantId) {
    const config = await this.getRestaurantConfig(restaurantId);
    return config.messages || {};
  }

  // --- MÉTODOS DE DISPONIBILIDAD ---
  async updateAvailability(restaurantId, status, reason, updatedBy = 'system') {
    if (status === 'open') {
      try {
        // 🔥 CORRECCIÓN: Carga perezosa para romper el ciclo de dependencia.
        const botService = require('./botService');
        await this.enableBot(restaurantId);
        console.log(`[configService] Iniciando bot para ${restaurantId}`);
        await botService.initBot(restaurantId);
      } catch (error) {
        console.error(`Error forzando activación del bot para ${restaurantId}:`, error);
      }
    }

    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'availability.status': status,
      'availability.reason': reason,
      'availability.lastUpdated': new Date(),
      'availability.lastUpdatedBy': updatedBy
    });

    return { success: true, status };
  }

  async updateAvailabilitySettings(restaurantId, settings) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'availabilitySettings': settings,
      updatedAt: new Date()
    });
    return { success: true };
  }

  async updateHours(restaurantId, hours) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'hours': hours,
      updatedAt: new Date()
    });
    return { success: true };
  }

  async updateDeliverySettings(restaurantId, delivery) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'delivery': delivery,
      updatedAt: new Date()
    });
    return { success: true };
  }

  async updatePaymentMethods(restaurantId, paymentMethods) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'paymentMethods': paymentMethods,
      updatedAt: new Date()
    });
    return { success: true };
  }

  async updateFeatures(restaurantId, features) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'features': features,
      updatedAt: new Date()
    });
    return { success: true };
  }

  async updateCommands(restaurantId, commands) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'commands': commands,
      updatedAt: new Date()
    });
    return { success: true };
  }

  async getNotificationSettings(restaurantId) {
    const config = await this.getRestaurantConfig(restaurantId);
    return config.notificationSettings || {};
  }

  async updateNotificationSettings(restaurantId, settings) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      notificationSettings: settings,
      updatedAt: new Date(),
    });
    return { success: true };
  }
}

module.exports = new ConfigService();