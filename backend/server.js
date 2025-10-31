// backend/server.js - VERSIÓN PARA VERCEL SERVERLESS
console.log("🚀 [server.js] Iniciando...");

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf'); 
const { session } = require('telegraf');
const { Redis } = require('@telegraf/session/redis');

// ===== CONFIGURACIÓN EXPRESS =====
const app = express(); 

// Middleware JSON (ANTES de las rutas)
app.use(express.json()); 

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
const store = Redis({ 
  url: redisUrl,
  // Opciones de configuración adicionales para mayor robustez en Vercel
  config: {
    // Forzar TLS, requerido por Vercel KV
    tls: {},
    // Aumentar timeouts para entornos serverless
    connectTimeout: 15000,
    commandTimeout: 8000,
  },
  lazyConnect: false
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

// Contactos
bot.on('contact', async (ctx) => { 
  const contact = ctx.message.contact;
  console.log('📞 [server.js] Contacto recibido:', contact.phone_number);
  
  if (!ctx.session || !ctx.session.cart) {
    await ctx.reply('No hay un pedido activo. Usa /pedido para comenzar.');
    return;
  }
  
  ctx.session.cart.customerPhone = contact.phone_number;
  ctx.session.cart.customerName = `${contact.first_name} ${contact.last_name || ''}`.trim();
  
  await ctx.reply('✅ Información de contacto guardada.');
  await orderHandler(ctx);
});

// Error handler
bot.catch((err, ctx) => { 
  console.error('❌ [server.js] Error en bot:', err);
  ctx.reply('Ocurrió un error. Por favor intenta de nuevo o usa /start').catch(console.error);
});

console.log("✅ [server.js] Handlers registrados"); 

// ===== RUTA WEBHOOK (CRÍTICA PARA VERCEL) =====
app.post('/api/webhook', async (req, res) => { 
  console.log('📨 [webhook] Recibido:', JSON.stringify(req.body).substring(0, 100));
  
  try {
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('❌ [webhook] Error:', error);
    // Siempre responder 200 para evitar reintentos de Telegram
    res.status(200).json({ ok: false, error: error.message });
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
app.get('/health', (req, res) => { 
  res.json({
    status: 'ok',
    timestamp: new Date(),
    botConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
    redisConfigured: !!process.env.KV_URL
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