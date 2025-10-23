//backend/src/services/configService.js
const { db } = require('../config/firebase');

class ConfigService {
  async getRestaurantConfig(restaurantId) {
    const doc = await db.collection('restaurants').doc(restaurantId).get();
    if (!doc.exists) {
      throw new Error('Restaurant not found');
    }
    return doc.data();
  }

  async updateMessages(restaurantId, messages) {
    await db.collection('restaurants').doc(restaurantId).update({
      messages,
      updatedAt: new Date()
    });
    return { success: true };
  }

  async getMessages(restaurantId) {
    const config = await this.getRestaurantConfig(restaurantId);
    return config.messages;
  }
}

module.exports = new ConfigService();
