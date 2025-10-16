const { db } = require('../config/firebase');

class ReminderService {
  // Verifica si es momento de enviar un recordatorio de apertura
  async shouldSendOpeningReminder(restaurantId) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().substring(0, 5);
    // La ventana es desde que *debería* abrir hasta 5 minutos después
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60000);
    const fiveMinutesLaterStr = fiveMinutesLater.toTimeString().substring(0, 5);

    const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
    if (!restaurantDoc.exists) {
      throw new Error('Restaurante no encontrado');
    }
    const data = restaurantDoc.data();
    const { hours, availability, availabilitySettings } = data;

    // Aplica solo si remindersEnabled, mode es hybrid y useScheduledHours es true
    if (!availabilitySettings?.remindersEnabled || availabilitySettings.mode !== 'hybrid' || !availabilitySettings.useScheduledHours) {
      return false;
    }

    const dayKey = this.getDayKey(dayOfWeek); // 0 (Domingo) a 6 (Sábado)
    const scheduledOpenTime = hours[dayKey]?.open;
    const lastOpenReminderSent = availability.lastOpenReminderSent;

    // Si hay un horario programado para abrir HOY
    if (scheduledOpenTime) {
      // Si el horario de apertura YA PASÓ Y aún está dentro de la ventana de 5 minutos
      // Y el estado actual NO es "open" ni "closed_by_owner"
      // Y si NO se envió un recordatorio recientemente (evitar spam, por ejemplo, 10 minutos de buffer)
      if (currentTime >= scheduledOpenTime && currentTime <= fiveMinutesLaterStr &&
          availability.status !== "open" &&
          availability.status !== "closed_by_owner" &&
          (!lastOpenReminderSent || new Date(lastOpenReminderSent) < new Date(now.getTime() - 10 * 60000))) {
        return true; // ¡Es momento de recordar!
      }
    }
    return false;
  }

  getDayKey(dayIndex) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  }
}

module.exports = new ReminderService();
