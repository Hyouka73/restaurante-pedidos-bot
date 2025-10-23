//backend/src/services/notificationService.js
// Importar el SDK de Firebase Admin (ya debería estar disponible)
const { getMessaging } = require('firebase-admin/messaging');
const { db } = require('../config/firebase');

class NotificationService {
  // Enviar recordatorio de apertura al dueño del restaurante
  async sendOpeningReminderToOwner(restaurantId, scheduledOpenTime) {
    try {
      // 1. Obtener el UID del dueño del restaurante
      const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
      if (!restaurantDoc.exists) {
        console.error(`Restaurante ${restaurantId} no encontrado para enviar recordatorio.`);
        return;
      }
      const ownerUid = restaurantDoc.data().ownerUid;

      // 2. Obtener la suscripción FCM del usuario (debería haberse guardado previamente)
      const userDoc = await db.collection('users').doc(ownerUid).get();
      if (!userDoc.exists) {
        console.error(`Usuario ${ownerUid} no encontrado.`);
        return;
      }
      const userData = userDoc.data();
      const fcmToken = userData.fcmToken; // Asumiendo que guardaste el token aquí

      if (!fcmToken) {
        console.warn(`Usuario ${ownerUid} no tiene FCM token registrado.`);
        return;
      }

      // 3. Crear el mensaje
      const message = {
        notification: {
          title: '⏰ Recordatorio de Apertura',
          body: `Ya son las ${scheduledOpenTime} y tu restaurante debería estar abierto. ¿Está todo listo para recibir pedidos?`
        },
        // Opcional: Datos para manejar la notificación en la app
        data: {
          type: 'opening_reminder',
          restaurantId: restaurantId,
        },
        token: fcmToken,
      };

      // 4. Enviar el mensaje
      const response = await getMessaging().send(message);
      console.log('Recordatorio de apertura enviado correctamente:', response);

      // 5. Actualizar Firestore para indicar que se envió el recordatorio
      await db.collection('restaurants').doc(restaurantId).update({
        'availability.lastOpenReminderSent': new Date()
      });

    } catch (error) {
      console.error('Error al enviar recordatorio de apertura:', error);
      // Manejar el error, tal vez reintentar o registrar
    }
  }
}

module.exports = new NotificationService();
