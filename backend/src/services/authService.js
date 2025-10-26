// backend/src/services/authService.js
const { db, admin } = require('../config/firebase'); // Asegúrate de importar 'admin' también si se usa

class AuthService {

  // Crear o obtener usuario y su restaurante (método central para registro)
  async createUserWithRestaurant(userData) {
    const { uid, email, displayName } = userData;

    // Crear documento de usuario en Firestore
    const userRef = db.collection('users').doc(uid);
    const restaurantRef = db.collection('restaurants').doc(uid); // Usamos UID como ID del restaurante

    const restaurantData = {
      info: {
        name: displayName || email.split('@')[0], // Usa displayName o parte del email
        description: '',
        phone: '',
        location: null,
        telegramToken: ''
      },
      hours: {
        monday: { open: "10:00", close: "22:00", closed: false },
        tuesday: { open: "10:00", close: "22:00", closed: false },
        wednesday: { open: "10:00", close: "22:00", closed: false },
        thursday: { open: "10:00", close: "22:00", closed: false },
        friday: { open: "10:00", close: "23:00", closed: false },
        saturday: { open: "10:00", close: "23:00", closed: false },
        sunday: { open: "10:00", close: "21:00", closed: false }
      },
      availability: {
        status: 'closed', // Estado manual inicial
        reason: 'Configuración inicial',
        lastUpdated: new Date(),
        lastUpdatedBy: 'system'
      },
      availabilitySettings: {
        mode: 'scheduled_hours', // 'scheduled_hours', 'manual_control', 'always_open'
        useScheduledHours: true,
        remindersEnabled: true,
        openReminderTime: 10, // minutos antes de abrir
        lastOpenReminderSent: null
      },
      delivery: {
        enabled: true,
        type: "distance_based", // "fixed" o "distance_based"
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

    // Usamos una transacción para asegurar que ambos documentos se creen juntos
    const transactionResult = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        transaction.set(userRef, {
          email: email,
          displayName: displayName,
          restaurantId: uid, // Vinculamos el ID del restaurante
          createdAt: new Date(),
          role: 'owner' // Asumimos rol de owner
        });
        transaction.set(restaurantRef, restaurantData);
        console.log(`Usuario y restaurante ${uid} creados en Firestore.`);
      } else {
        console.log(`Usuario ${uid} ya existía en Firestore.`);
      }
    });

    return { uid, restaurantId: uid };
  }

  // Obtener datos del restaurante por UID del usuario (método de verificación de acceso)
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

  // Método para verificar si un usuario es el dueño de un restaurante específico (método de autorización)
  async isOwner(userId, restaurantId) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return false;
    }
    const userRestaurantId = userDoc.data().restaurantId;
    return userRestaurantId === restaurantId;
  }

  // Método para verificar si un token de Telegram ya está asociado a otro restaurante (método auxiliar, puede quedarse aquí o moverse)
  // Si se usa solo en el contexto de autenticación/creación, puede quedarse.
  // Si se usa más ampliamente, podría ir a configService.
  async isTokenUsed(token) {
    const snapshot = await db.collection('restaurants')
      .where('info.telegramToken', '==', token)
      .limit(1)
      .get();
    return !snapshot.empty;
  }

  // Método para obtener el restaurantId por token de Telegram (método auxiliar, puede quedarse aquí o moverse)
  // Similar al anterior.
  async getRestaurantIdByToken(token) {
    const snapshot = await db.collection('restaurants')
      .where('info.telegramToken', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error('Restaurante no encontrado para este token');
    }

    return snapshot.docs[0].id; // Devuelve el ID del documento (restaurantId)
  }

  // Método para obtener el UID del dueño del restaurante (método auxiliar, puede quedarse aquí o moverse)
  // Similar al anterior.
  async getOwnerId(restaurantId) {
    const snapshot = await db.collection('users')
      .where('restaurantId', '==', restaurantId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      throw new Error('Dueño del restaurante no encontrado');
    }

    return snapshot.docs[0].id; // Devuelve el UID del usuario
  }
  async getUserNotificationPrefs(userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('Usuario no encontrado');
    }
    const { notificationsEnabled, fcmToken } = userDoc.data();
    return { notificationsEnabled: notificationsEnabled || false, fcmToken: fcmToken || null };
  }

  async updateUserNotificationPrefs(userId, prefs) {
    const userRef = db.collection('users').doc(userId);
    await userRef.update(prefs);
    return { success: true };
  }

}

module.exports = new AuthService();