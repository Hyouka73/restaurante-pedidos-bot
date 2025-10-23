const { db } = require('../config/firebase');

class DeliveryService {
  /**
   * Calcula la tarifa de envío basada en distancia (haversine) y configuración del restaurante
   * @param {string} restaurantId
   * @param {{ latitude: number, longitude: number }} customerLocation
   * @returns {Promise<{ fee: number, distanceKm: number, withinMaxDistance: boolean }>}
   */
  async calculateFee(restaurantId, customerLocation) {
    // Implementación mínima: leer config.delivery y restaurant location si existe
    try {
      const restDoc = await db.collection('restaurants').doc(restaurantId).get();
      if (!restDoc.exists) throw new Error('Restaurante no encontrado');

      const data = restDoc.data();
      const delivery = data?.delivery || { enabled: false };
      const restaurantLocation = data?.info?.location; // { latitude, longitude }

      if (!delivery.enabled) return { fee: 0, distanceKm: 0, withinMaxDistance: false };
      if (!restaurantLocation) return { fee: 0, distanceKm: 0, withinMaxDistance: false };

      const distanceKm = this._haversineKm(restaurantLocation.latitude, restaurantLocation.longitude, customerLocation.latitude, customerLocation.longitude);

      const within = distanceKm <= (delivery.maxDistance || 10);
      const base = delivery.baseCost || 0;
      const perKm = delivery.costPerKm || 0;

      const fee = within ? Math.max(0, base + perKm * distanceKm) : Infinity;

      return { fee: parseFloat(fee.toFixed(2)), distanceKm: parseFloat(distanceKm.toFixed(2)), withinMaxDistance: within };
    } catch (err) {
      console.error('Error calculating delivery fee:', err);
      throw err;
    }
  }

  _haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (v) => v * Math.PI / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

module.exports = new DeliveryService();
