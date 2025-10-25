// backend/src/services/availabilityService.js
const { db } = require('../config/firebase');

class AvailabilityService {

  /**
   * Obtiene la clave de día ('sunday', 'monday', etc.) a partir de un índice numérico.
   * @param {number} dayIndex - Índice del día de la semana (0 para Domingo, 6 para Sábado).
   * @returns {string}
   */
  getDayKey(dayIndex) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  }

  /**
   * Verifica la disponibilidad de un restaurante basándose en su modo de operación.
   * @param {string} restaurantId - El ID del restaurante.
   * @returns {Promise<object>} - Un objeto con el estado de disponibilidad.
   */
  async checkAvailability(restaurantId) {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();

    if (!restaurantDoc.exists) {
      console.error(`Restaurante no encontrado con ID: ${restaurantId}`);
      throw new Error('Restaurante no encontrado');
    }

    const data = restaurantDoc.data();
    const mode = data.availabilitySettings?.mode || 'hybrid'; // 'hybrid' como default
    const manualStatus = data.availability?.status; // 'open' o 'closed'
    const hours = data.hours || {};

    // Modo 1: Siempre Abierto
    if (mode === 'always_open') {
      return { status: 'open', reason: 'El restaurante opera 24/7.' };
    }

    // Modo 2: Control Manual
    if (mode === 'manual') {
      if (manualStatus === 'open') {
        return { status: 'open', reason: 'Abierto manualmente por el operador.' };
      }
      return { status: 'closed', reason: 'Cerrado manualmente por el operador.' };
    }

    // Modo 3: Horarios Fijos
    if (mode === 'fixed') {
      const now = new Date();
      const dayKey = this.getDayKey(now.getDay());
      const schedule = hours[dayKey];
      const currentTime = now.toTimeString().substring(0, 5);

      if (schedule?.closed) {
        return { status: 'closed', reason: 'Cerrado por horario (hoy no se abre).' };
      }

      if (schedule?.open && schedule?.close && currentTime >= schedule.open && currentTime < schedule.close) {
        return { status: 'open', reason: 'Dentro del horario de atención.' };
      }
      
      const openTime = schedule?.open || 'N/A';
      return { status: 'closed', reason: `Fuera de horario. El horario es de ${openTime} a ${schedule?.close || 'N/A'}.` };
    }

    // Modo 4: Híbrido (combina manual y horario)
    // En este modo, el estado manual tiene prioridad. El horario es para referencia.
    if (mode === 'hybrid') {
      if (manualStatus === 'open') {
        return { status: 'open', reason: 'Abierto manualmente por el operador.' };
      }
      // Si no está abierto manualmente, se considera cerrado, independientemente del horario.
      // El frontend usará el horario para las sugerencias, pero el backend respeta el estado manual.
      return { status: 'closed', reason: 'El restaurante no ha sido abierto manualmente.' };
    }

    // Default fallback
    return { status: 'closed', reason: 'Modo de disponibilidad no configurado o desconocido.' };
  }

  // --- Funciones de ayuda existentes ---

  async getTodaySchedule(restaurantId) {
    const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
    if (!restaurantDoc.exists) {
      throw new Error('Restaurante no encontrado');
    }
    const { hours } = restaurantDoc.data();
    const now = new Date();
    const dayKey = this.getDayKey(now.getDay());
    
    return {
      dayName: this.getDayName(dayKey),
      schedule: hours ? hours[dayKey] : {},
      currentTime: now.toTimeString().substring(0, 5)
    };
  }

  getDayName(dayKey) {
    const days = {
      'sunday': 'Domingo',
      'monday': 'Lunes',
      'tuesday': 'Martes',
      'wednesday': 'Miércoles',
      'thursday': 'Jueves',
      'friday': 'Viernes',
      'saturday': 'Sábado'
    };
    return days[dayKey];
  }
}

module.exports = new AvailabilityService();