// backend/src/services/dashboardService.js
const { db } = require('../config/firebase');

class DashboardService {

  async getDashboardStats(restaurantId) {
    const ordersRef = db.collection('restaurants').doc(restaurantId).collection('orders');
    const ordersQuery = ordersRef.orderBy('createdAt', 'desc');
    const ordersSnapshot = await ordersQuery.get();
    
    const ordersList = [];
    let totalRevenue = 0;
    let pendingCount = 0;

    ordersSnapshot.forEach((doc) => {
      const data = doc.data();
      ordersList.push({ id: doc.id, ...data });
      if (data.status !== 'cancelled') {
        totalRevenue += data.total || 0;
      }
      if (data.status === 'pending') {
        pendingCount++;
      }
    });

    const totalOrders = ordersList.length;
    const nonCancelledOrdersCount = ordersList.filter(o => o.status !== 'cancelled').length;
    const avgOrderValue = nonCancelledOrdersCount > 0 ? (totalRevenue / nonCancelledOrdersCount) : 0;

    const metrics = {
      totalOrders,
      pendingOrders: pendingCount,
      revenue: totalRevenue,
      avgOrderValue,
    };

    const recentOrders = ordersList.slice(0, 5);

    return { metrics, recentOrders };
  }

}

module.exports = new DashboardService();