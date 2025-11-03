
const { db } = require('../config/firebase');
const ss = require('simple-statistics');

const CACHE_DURATION_DAYS = 15;

async function getProjectionStatus(restaurantId) {
  const cacheRef = db.doc(`restaurants/${restaurantId}/dashboard_cache/salesProjection`);
  const cacheDoc = await cacheRef.get();

  if (!cacheDoc.exists) {
    return { status: 'stale' };
  }

  const cacheData = cacheDoc.data();
  const lastCalculated = cacheData.lastCalculated.toDate();
  const now = new Date();
  const cacheAgeDays = (now - lastCalculated) / (1000 * 60 * 60 * 24);

  if (cacheAgeDays < CACHE_DURATION_DAYS) {
    return { status: 'fresh' };
  } else {
    return { status: 'stale' };
  }
}

async function getProjectionData(restaurantId) {
  const cacheRef = db.doc(`restaurants/${restaurantId}/dashboard_cache/salesProjection`);
  const cacheDoc = await cacheRef.get();

  if (cacheDoc.exists) {
    const cacheData = cacheDoc.data();
    const lastCalculated = cacheData.lastCalculated.toDate();
    const now = new Date();
    const cacheAgeDays = (now - lastCalculated) / (1000 * 60 * 60 * 24);

    if (cacheAgeDays < CACHE_DURATION_DAYS) {
      return cacheData;
    }
  }

  // Cache is stale or doesn't exist, recalculate
  const ordersSnapshot = await db.collection('orders')
    .where('restaurantId', '==', restaurantId)
    .where('status', 'in', ['delivered', 'completed'])
    .orderBy('createdAt', 'asc')
    .get();

  if (ordersSnapshot.empty) {
    return { message: 'No sales data available to generate a projection.' };
  }

  const salesData = {};
  ordersSnapshot.forEach(doc => {
    const order = doc.data();
    const date = order.createdAt.toDate().toISOString().split('T')[0];
    if (!salesData[date]) {
      salesData[date] = 0;
    }
    salesData[date] += order.total;
  });

  const historicalData = Object.keys(salesData).map((date, index) => [index, salesData[date]]);

  if (historicalData.length < 14) {
    return { message: 'Not enough historical data to create a reliable projection. At least 14 days of sales are required.' };
  }

  const regression = ss.linearRegression(historicalData);
  const line = ss.linearRegressionLine(regression);

  const lastDateIndex = historicalData.length - 1;
  const projectedData = [];
  for (let i = 1; i <= 7; i++) {
    const projectedValue = line(lastDateIndex + i);
    projectedData.push(projectedValue > 0 ? projectedValue : 0);
  }

  const result = {
    historical: historicalData.map(d => d[1]),
    projected: projectedData,
    lastCalculated: new Date(),
  };

  await cacheRef.set(result);

  return result;
}

async function getDashboardStats(restaurantId) {
  const ordersRef = db.collection('orders').where('restaurantId', '==', restaurantId);
  const snapshot = await ordersRef.get();

  if (snapshot.empty) {
    return {
      metrics: {
        totalOrders: 0,
        pendingOrders: 0,
        revenue: 0,
        avgOrderValue: 0,
      },
      recentOrders: [],
    };
  }

  let totalOrders = 0;
  let pendingOrders = 0;
  let revenue = 0;
  let completedOrdersCount = 0;
  const allOrders = [];

  snapshot.forEach(doc => {
    const order = { id: doc.id, ...doc.data() };
    allOrders.push(order);

    if (order.status !== 'cancelled') {
      totalOrders++;
    }

    if (order.status === 'completed' || order.status === 'delivered') {
      revenue += order.total;
      completedOrdersCount++;
    } else if (order.status !== 'cancelled') {
      pendingOrders++;
    }
  });

  const avgOrderValue = completedOrdersCount > 0 ? revenue / completedOrdersCount : 0;

  const recentOrders = allOrders
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, 5);

  return {
    metrics: {
      totalOrders,
      pendingOrders,
      revenue,
      avgOrderValue,
    },
    recentOrders,
  };
}


module.exports = {
  getProjectionStatus,
  getProjectionData,
  getDashboardStats,
};
