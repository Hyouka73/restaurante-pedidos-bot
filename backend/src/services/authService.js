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
        friday: { open: "10:00", close: "23:00", closed: false },
        saturday: { open: "10:00", close: "23:00", closed: false },
        sunday: { open: "10:00", close: "22:00", closed: false }
      },
      availabilitySettings: {
        mode: 'hybrid', // Opciones: 'fixed_hours', 'always_open', 'manual_control', 'hybrid'
        useScheduledHours: true,
        remindersEnabled: true,
      },
      availability: {
        status: 'open', // Opciones: 'open', 'closed_by_owner', 'outside_hours', 'pending_open_reminder'
        reason: null,
        lastUpdated: new Date(),
        lastOpenReminderSent: null
      },
      delivery: {
        enabled: true,
        type: "distance_based",
        baseCost: 30,
        costPerKm: 5,
        maxDistance: 10,
        freeDeliveryMinAmount: 150
      },
      paymentMethods: [
        { id: "cash", name: "Efectivo", enabled: true },
        { id: "card", name: "Tarjeta", enabled: true },
        { id: "transfer", name: "Transferencia", enabled: false }
      ],
      features: {
        deliveryEnabled: true,
        pickupEnabled: true,
        askForName: true,
        askForPhone: true,
        requireLocationIfDelivery: true,
        showMenuImages: true,
        acceptComplaints: true
      },
      messages: {
        welcome: '¡Hola {nombre}! Bienvenido a {restaurante}',
        menu_intro: 'Este es nuestro menú:',
        ask_delivery_or_pickup: '¿Cómo deseas tu pedido?',
        ask_location: 'Por favor, comparte tu ubicación para calcular el envío.',
        order_confirmed: '✅ Pedido #{numero} confirmado. Total: ${total}.',
        order_preparing: '👨‍🍳 Tu pedido está en preparación.',
        order_ready: '✅ ¡Tu pedido está listo!',
        order_delivered: '🎉 ¡Gracias por tu compra!',
        closed_message: 'Lo sentimos, estamos cerrados. Horario: {horario}',
        outside_hours_message: 'Lo sentimos, estamos fuera de horario. Horario: {horario}',
        complaint_message: 'Gracias por tu comentario. Lo revisaremos pronto.'
      },
      commands: {
        start: { enabled: true, description: "Iniciar conversación" },
        menu: { enabled: true, description: "Ver menú completo" },
        pedido: { enabled: true, description: "Hacer un pedido" },
        estado: { enabled: true, description: "Ver estado de mi pedido" },
        ayuda: { enabled: true, description: "Obtener ayuda" },
        reclamar: { enabled: true, description: "Enviar un comentario o reclamo" }
      },
      setupCompleted: false, // Importante: Inicia en false
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

  // Actualizar información del restaurante
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