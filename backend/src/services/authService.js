const { db, admin } = require('../config/firebase');

class AuthService {
  // Crear o obtener usuario y su restaurante
  async createUserWithRestaurant(userData) {
    const { uid, email, displayName } = userData;
    const restaurantId = uid; // Usamos el UID del usuario como ID del restaurante

    // Crear perfil de usuario
    const userRef = db.collection('users').doc(uid);
    await userRef.set({
      email,
      displayName,
      restaurantId,
      role: 'owner', // Por defecto, el creador es owner
      createdAt: new Date()
    });

    // Crear perfil del restaurante con valores por defecto
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantData = {
      name: 'Mi Restaurante', // Valor por defecto
      ownerUid: uid,
      info: {
        name: 'Mi Restaurante',
        phone: '',
        address: ''
      },
      hours: {
        monday: { open: "10:00", close: "22:00", closed: false },
        tuesday: { open: "10:00", close: "22:00", closed: false },
        wednesday: { open: "10:00", close: "22:00", closed: false },
        thursday: { open: "10:00", close: "22:00", closed: false },
        friday: { open: "10:00", close: "22:00", closed: false },
        saturday: { open: "10:00", close: "22:00", closed: false },
        sunday: { open: "10:00", close: "22:00", closed: false }
      },
      messages: {
        welcome: 'Â¡Hola {nombre}! Bienvenido a {restaurante}',
        menu_intro: 'Este es nuestro menÃº:',
        ask_delivery: 'Â¿CÃ³mo deseas tu pedido?',
        order_confirmed: 'âœ… Pedido #{numero} confirmado. Total: ',
        order_preparing: 'í±¨â€í½³ Tu pedido estÃ¡ en preparaciÃ³n',
        order_ready: 'âœ… Â¡Tu pedido estÃ¡ listo!',
        order_delivered: 'í¾‰ Â¡Gracias por tu compra!'
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

    await restaurantRef.set(restaurantData);

    return { uid, restaurantId };
  }

  // Obtener datos del restaurante por UID del usuario
  async getRestaurantByUserUid(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new Error('Usuario no encontrado');
    }

    const restaurantId = userDoc.data().restaurantId;
    const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();

    if (!restaurantDoc.exists) {
      throw new Error('Restaurante no encontrado');
    }

    return { restaurantId: restaurantDoc.id, ...restaurantDoc.data() };
  }

  // Actualizar informaciÃ³n del restaurante
  async updateRestaurantInfo(restaurantId, updateData) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    await restaurantRef.update({
      ...updateData,
      updatedAt: new Date()
    });
    return { success: true };
  }
}

module.exports = new AuthService();
