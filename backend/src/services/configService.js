// backend/src/services/configService.js
const { db } = require('../config/firebase');

class ConfigService {

  // Obtener configuración general del restaurante (info, horarios, etc.)
  async getRestaurantConfig(restaurantId) {
    const doc = await db.collection('restaurants').doc(restaurantId).get();
    if (!doc.exists) {
      throw new Error('Restaurant not found');
    }
    return doc.data();
  }

  // Obtener solo la información general (info, horarios, availabilitySettings, delivery, paymentMethods, features, commands)
  async getGeneralInfo(restaurantId) {
    const config = await this.getRestaurantConfig(restaurantId);
    const { info, hours, availabilitySettings, delivery, paymentMethods, features, commands } = config;
    return { info, hours, availabilitySettings, delivery, paymentMethods, features, commands };
  }

  // Actualizar información general (info, horarios, etc.) - Combina varios métodos anteriores
  async updateGeneralInfo(restaurantId, updateData) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    // Usar update para permitir actualizaciones parciales por sección
    await restaurantRef.update({
      ...updateData,
      updatedAt: new Date()
    });

    // Devolver la configuración actualizada (solo la parte general)
    const updatedDoc = await restaurantRef.get();
    const data = updatedDoc.exists ? updatedDoc.data() : {};
    const { info, hours, availabilitySettings, delivery, paymentMethods, features, commands } = data;
    return { info, hours, availabilitySettings, delivery, paymentMethods, features, commands };
  }

  // Método específico para actualizar solo el token de Telegram
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

  // Método para marcar la configuración como completada
  async markSetupAsCompleted(restaurantId) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      setupCompleted: true,
      updatedAt: new Date()
    });
    return { success: true };
  }

  // --- MÉTODOS AÑADIDOS PARA HABILITAR/DESHABILITAR ---

  /**
   * Habilita el bot en la base de datos (features.botEnabled = true)
   */
  async enableBot(restaurantId) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'features.botEnabled': true,
      updatedAt: new Date()
    });
    return { success: true, enabled: true };
  }

  /**
   * Deshabilita el bot en la base de datos (features.botEnabled = false)
   */
  async disableBot(restaurantId) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'features.botEnabled': false,
      updatedAt: new Date()
    });
    return { success: true, enabled: false };
  }


  // --- MÉTODOS EXISTENTES ---

  // Actualizar mensajes del bot (método existente)
  async updateMessages(restaurantId, messages) {
    await db.collection('restaurants').doc(restaurantId).update({
      messages,
      updatedAt: new Date()
    });
    return { success: true };
  }

  // Obtener mensajes del bot (método existente)
  async getMessages(restaurantId) {
    const config = await this.getRestaurantConfig(restaurantId);
    return config.messages;
  }

  // --- MÉTODOS DE DISPONIBILIDAD MOVIDOS DESDE authService ---
  // Actualizar el estado de disponibilidad manualmente (usado por el bot o el panel)
  async updateAvailability(restaurantId, status, reason, updatedBy = 'system') {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'availability.status': status,
      'availability.reason': reason,
      'availability.lastUpdated': new Date(),
      'availability.lastUpdatedBy': updatedBy
    });
    return { success: true };
  }

  // Actualizar el estado de disponibilidad y el modo
  async updateAvailabilitySettings(restaurantId, settings) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'availabilitySettings': settings,
      updatedAt: new Date()
    });
    return { success: true };
  }

  // Actualizar el horario
  async updateHours(restaurantId, hours) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'hours': hours,
      updatedAt: new Date()
    });
    return { success: true };
  }

  // Actualizar la configuración de entrega
  async updateDeliverySettings(restaurantId, delivery) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'delivery': delivery,
      updatedAt: new Date()
    });
    return { success: true };
  }

  // Actualizar los métodos de pago
  async updatePaymentMethods(restaurantId, paymentMethods) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'paymentMethods': paymentMethods,
      updatedAt: new Date()
    });
    return { success: true };
  }

  // Actualizar las características
  async updateFeatures(restaurantId, features) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      'features': features,
      updatedAt: new Date()
    });
    return { success: true };
  }

  // Actualizar los comandos
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