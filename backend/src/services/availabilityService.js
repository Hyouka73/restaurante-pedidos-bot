const { db } = require('../config/firebase');

class AvailabilityService {
  async checkAvailability(restaurantId) {
    const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
    if (!restaurantDoc.exists) {
      throw new Error('Restaurante no encontrado');
    }
    const { availability, availabilitySettings, hours } = restaurantDoc.data();
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Domingo) a 6 (Sábado)
    const currentTime = now.toTimeString().substring(0, 5); // "HH:MM"

    const { mode, useScheduledHours } = availabilitySettings;

    // 1. Si el modo es "manual_control" o "always_open", ignora horarios
    if (mode === "manual_control") {
      // Solo se basa en el estado 
      return availability; // { status: "...", reason: "..." }
    }
    if (mode === "always_open") {
      return { status: "open", reason: null };
    }

    // 2. Si el modo es "hybrid" o "fixed_hours", se usan los horarios
    if (mode === "hybrid" || mode === "fixed_hours") {
      const dayKey = this.getDayKey(dayOfWeek);
      const scheduledOpenTime = hours[dayKey]?.open;
      const scheduledCloseTime = hours[dayKey]?.close;
      const isClosedToday = hours[dayKey]?.closed;

      if (isClosedToday) {
        return { status: "outside_hours", reason: "Cerrado hoy" };
      }

      // Verificar si está dentro del horario programado
      const isOpenNow = currentTime >= scheduledOpenTime && currentTime < scheduledCloseTime;

      if (isOpenNow) {
        // Está dentro del horario programado
        // a) Si "useScheduledHours" es true (comportamiento tipo "fixed_hours"):
        if (useScheduledHours) {
          if (availability.status === "closed_by_owner") {
            return availability; // Devuelve el estado manual
          }
          // Si no está cerrado manualmente, y está dentro del horario, está abierto.
          return { status: "open", reason: null };
        }

        // b) Si "useScheduledHours" es false (comportamiento tipo "hybrid" puro):
        if (availability.status === "pending_open_reminder") {
          // El dueño aún no ha respondido al recordatorio.
          // Para este flujo refinado, si está en pending_open_reminder, aún no está "abierto".
          // Se espera una acción del dueño.
          return { status: "outside_hours", reason: "El restaurante aún no ha confirmado apertura para hoy." };
        }
        // Si no es ninguno de los anteriores, usar el estado actual
        return availability;
      } else {
        // Está fuera del horario programado
        return { status: "outside_hours", reason: `Fuera de horario. Abre a las ${scheduledOpenTime}.` };
      }
    }

    // Si no coincide con nada, asumir cerrado
    return { status: "outside_hours", reason: "No disponible." };
  }

  getDayKey(dayIndex) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  }
}

module.exports = new AvailabilityService();
