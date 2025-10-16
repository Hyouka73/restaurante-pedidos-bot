const { db } = require('../../config/firebase');

class ConfigBotService {
  async getRestaurantMessages(restaurantId) {
    try {
      const doc = await db.collection('restaurants').doc(restaurantId).get();
      if (!doc.exists) {
        // Si no existe, crea uno con valores por defecto
        const defaultConfig = {
          messages: {
            welcome: '¡Hola {nombre}! Bienvenido a {restaurante}',
            menu_intro: 'Este es nuestro menú:',
            ask_delivery: '¿Cómo deseas tu pedido?',
            order_confirmed: '✅ Pedido #{numero} confirmado. Total: ${total}',
            order_preparing: '👨‍🍳 Tu pedido está en preparación',
            order_ready: '✅ ¡Tu pedido está listo!',
            order_delivered: '🎉 ¡Gracias por tu compra!'
          },
          info: {
            name: 'Mi Restaurante'
          },
          features: {
            delivery_enabled: true,
            pickup_enabled: true,
            ask_name: true,
            ask_phone: true,
            require_location: true,
            show_menu_images: true
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await db.collection('restaurants').doc(restaurantId).set(defaultConfig);
        return defaultConfig.messages;
      }
      return doc.data().messages;
    } catch (error) {
      console.error('Error al obtener mensajes del restaurante:', error);
      throw error;
    }
  }

  // Nueva función para obtener datos completos del restaurante
  async getRestaurantData(restaurantId) {
    try {
      const doc = await db.collection('restaurants').doc(restaurantId).get();
      if (!doc.exists) {
        throw new Error('Restaurante no encontrado');
      }
      return doc.data();
    } catch (error) {
      console.error('Error al obtener datos del restaurante:', error);
      throw error;
    }
  }
}

module.exports = new ConfigBotService();