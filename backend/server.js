// backend/server.js - VERSIÓN PARA VERCEL SERVERLESS
console.log("🚀 [server.js] Iniciando...");

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf'); 
const { session } = require('telegraf');
const { Redis } = require('@telegraf/session/redis');
const IORedis = require('ioredis');

const cookieParser = require('cookie-parser');

// ===== CONFIGURACIÓN EXPRESS =====
const app = express(); 

// Middleware JSON (ANTES de las rutas)
app.use(express.json()); 
app.use(cookieParser());

// CORS
const corsOptions = { 
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions)); 

// ===== CONFIGURACIÓN BOT =====
console.log("🤖 [server.js] Configurando bot...");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN); 

// ✅ CONFIGURAR SESIÓN REDIS (ANTES DE HANDLERS)
const redisUrl = process.env.KV_URL; 
if (!redisUrl) { 
  console.error('❌ [server.js] KV_URL no encontrado en variables de entorno');
  throw new Error('KV_URL es requerido para sesiones');
}

console.log("📦 [server.js] Conectando a Redis...");

// Create and configure an ioredis client instance
const redisClient = new IORedis(redisUrl, {
  tls: {}, // Requerido para Vercel KV
  connectTimeout: 10000, // Timeout de conexión para fallar más rápido.
  commandTimeout: 5000,
  // 🔥 CORRECCIÓN CRÍTICA: Desactiva la cola offline. Si no hay conexión, los comandos fallan inmediatamente.
  // Esto evita que la ejecución de la función serverless se quede colgada esperando a Redis.
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 100, 3000); // Reintenta más rápido al principio, con un máximo de 3s.
    console.warn(`[Redis] Reintentando conexión (intento ${times})...`);
    return delay;
  },
  lazyConnect: true // No conectar hasta que se use por primera vez.
});

// 🔥 MEJORA: Manejadores de eventos para mejor visibilidad del estado de la conexión.
redisClient.on('error', (err) => {
  // Este manejador ya existía, pero es vital. Evita que un error de conexión crashee el proceso.
  console.error('❌ [Redis Session Client] Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ [Redis] Conectado exitosamente.');
});

redisClient.on('close', () => {
  // Este log es útil para saber cuándo se pierde la conexión y ioredis intentará reconectar.
  console.warn('[Redis] La conexión se cerró. ioredis intentará reconectar.');
});


// Pass the pre-configured client to the session store
const store = Redis({
  client: redisClient,
});

// Middleware de sesión (CRÍTICO: ANTES de handlers)
bot.use(session({ 
  store: store, 
  ttl: 60 * 60 * 24 * 3, // 3 días
  getSessionKey: (ctx) => {
    if (ctx.chat && ctx.from) {
      return `${ctx.chat.id}:${ctx.from.id}`;
    }
    return null;
  }
}));

console.log("✅ [server.js] Sesión Redis configurada"); 

// --- 🔥 INYECTAR BOT EN SERVICIOS ---
// (Esto es crucial para que telegramNotificationService funcione)
// CORRECCIÓN: El archivo se llama telegramNotificationService.js
const telegramNotificationService = require('./src/services/telegramNotificationService');
telegramNotificationService.botInstance = bot;
// --- FIN DE LA INYECCIÓN ---

// ===== IMPORTAR HANDLERS =====
const startHandler = require('./src/bot/handlers/startHandler');
const { menuHandler } = require('./src/bot/handlers/menuHandler');
const orderHandler = require('./src/bot/handlers/orderHandler');
const myOrderHandler = require('./src/bot/handlers/myOrderHandler');
const interactionHandler = require('./src/bot/middleware/interactionHandler'); 

// ===== REGISTRAR HANDLERS =====
console.log("🔧 [server.js] Registrando handlers...");

bot.command('start', startHandler); 
bot.command('menu', menuHandler); 
bot.command('pedido', orderHandler); 
bot.command('mipedido', myOrderHandler); 

// Callback queries (botones inline)
bot.on('callback_query', interactionHandler); 

// Mensajes de texto
bot.on('text', async (ctx) => { 
  if (!ctx.message.text.startsWith('/')) {
    await orderHandler(ctx);
  }
});

// Ubicaciones
bot.on('location', orderHandler); 

// Contactos (ahora manejados por el orderHandler principal)
bot.on('contact', orderHandler);

// Error handler
bot.catch((err, ctx) => { 
  console.error(`❌ [server.js] Global bot error for user ${ctx.from?.id}:`, err);
  // Avoid crashing on "Connection is closed" errors, as ioredis will handle reconnection.
  if (err.message.includes('Connection is closed')) {
    console.warn('Redis connection was closed. ioredis will attempt to reconnect.');
  }
  // Try to inform the user, but don't fail if the context is weird.
  ctx.reply('😕 Ups, algo salió mal. Por favor, intenta de nuevo en un momento.').catch(e => {
    console.error('❌ [server.js] Failed to send error message to user:', e);
  });
});

console.log("✅ [server.js] Handlers registrados"); 

// ===== RUTA WEBHOOK (CRÍTICA PARA VERCEL) =====
app.post('/api/webhook', async (req, res) => { 
  console.log('📨 [webhook] Recibido:', JSON.stringify(req.body).substring(0, 100));
  
  try {
    // 🔥 CORRECCIÓN CRÍTICA: Debes usar 'await' aquí.
    // Esto fuerza a la función de Vercel a esperar a que
    // todo el procesamiento (sesión de Redis, startHandler, reply) termine
    // antes de enviar la respuesta y finalizar la ejecución.
    await bot.handleUpdate(req.body); 
    
    // Responde 200 OK a Telegram SÓLO DESPUÉS de procesar.
    res.status(200).json({ ok: true });

  } catch (error) {
    // Este catch ahora capturará errores de handleUpdate
    console.error('❌ [webhook] Error en handleUpdate:', error);
    
    // Es importante responder 200 a Telegram incluso si hay un error,
    // para evitar que reintente el mismo update.
    // El error ya se logueó para debugging.
    res.status(200).json({ ok: false, error: 'Error procesando update' }); 
  }
});

// ===== RUTAS API =====
const configRoutes = require('./src/api/routes/config');
const authRoutes = require('./src/api/routes/auth');
const menuRoutes = require('./src/api/routes/menu');
const ordersRoutes = require('./src/api/routes/orders');
const uploadRoutes = require('./src/api/routes/upload');
const botApiRoutes = require('./src/api/routes/bot');
const chatbotApiRoutes = require('./src/api/routes/chatbot');
const userRoutes = require('./src/api/routes/user');
const dashboardRoutes = require('./src/api/routes/dashboard');
const { router: eventsRoutes } = require('./src/api/routes/events');
const discountRulesRoutes = require('./src/api/routes/discountRules');
const qrRoutes = require('./src/api/routes/qr'); 

app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/bot', botApiRoutes);
app.use('/api/chatbot', chatbotApiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/discount-rules', discountRulesRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/events', eventsRoutes); 

// ===== RUTAS AUXILIARES =====
app.get('/health', async (req, res) => { 
  // 🔥 MEJORA: Health check real que verifica la conexión a Redis.
  let redisStatus = 'disconnected';
  try {
    // El comando PING es ligero y perfecto para verificar la conexión.
    const pingResponse = await redisClient.ping();
    if (pingResponse === 'PONG') {
      redisStatus = 'connected';
    }
  } catch (error) {
    console.error('[Health Check] Redis PING falló:', error.message);
    redisStatus = 'error';
  }

  res.status(redisStatus === 'connected' ? 200 : 503).json({
    status: redisStatus === 'connected' ? 'ok' : 'service_unavailable',
    botConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
    redisStatus: redisStatus
  });
});

app.get('/api', (req, res) => { 
  res.json({
    message: 'RestBot API',
    version: '1.0.0',
    status: 'running',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => { 
  res.json({
    message: 'RestBot - Sistema de Pedidos',
    webhook: '/api/webhook',
    api: '/api',
    health: '/health'
  });
});

// ===== MANEJO DE ERRORES =====
app.use((err, req, res, next) => { 
  console.error('❌ [server.js] Error Express:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// ===== INICIO DIFERENCIAL =====
if (process.env.NODE_ENV !== 'production') { 
  // MODO LOCAL: Usar polling
  console.log("🔧 [server.js] MODO DESARROLLO - Iniciando polling...");
  
  bot.launch().then(() => {
    console.log("✅ [server.js] Bot iniciado en modo polling");
  }).catch(err => {
    console.error("❌ [server.js] Error iniciando bot:", err);
  });

  // Limpiar webhook si existe
  bot.telegram.deleteWebhook().catch(console.error);

  // Iniciar servidor Express
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ [server.js] Servidor escuchando en http://localhost:${PORT}`);
  });

  // Graceful shutdown
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

} else { 
  // MODO PRODUCCIÓN: Webhook (Vercel)
  console.log("🚀 [server.js] MODO PRODUCCIÓN - Configurado para webhook");
}

// ===== EXPORTAR PARA VERCEL =====
console.log("✅ [server.js] Configuración completa"); 
module.exports = app; 