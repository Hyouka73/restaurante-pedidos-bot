//backend/server.js
require('dotenv').config();
const cors = require('cors');
const express = require('express');
const bot = require('./src/config/telegram');

const app = express();
const PORT = process.env.PORT || 3000;

// Verificar variables de entorno críticas
if (!process.env.TOKEN_SECRET) {
  console.warn('⚠️ TOKEN_SECRET is not set in environment. crypto operations will fail.');
} else {
  console.log(`🔐 TOKEN_SECRET configurado (${process.env.TOKEN_SECRET.length} chars)`);
}

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN no está configurado!');
  process.exit(1);
}

// Configuración de CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Rutas de API
const configRoutes = require('./src/api/routes/config');
const authRoutes = require('./src/api/routes/auth');
const menuRoutes = require('./src/api/routes/menu');
const ordersRoutes = require('./src/api/routes/orders');
const uploadRoutes = require('./src/api/routes/upload');
const botApiRoutes = require('./src/api/routes/bot');

app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/bot', botApiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    botConnected: bot.botInfo ? true : false
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'RestBot API - Sistema de Pedidos',
    version: '1.0.0',
    status: 'running'
  });
});

// ============================================
// CONFIGURACIÓN DEL BOT DE TELEGRAM
// ============================================

// Importar handlers
const startHandler = require('./src/bot/handlers/startHandler');
const menuHandler = require('./src/bot/handlers/menuHandler');
const orderHandler = require('./src/bot/handlers/orderHandler');
const myOrderHandler = require('./src/bot/handlers/myOrderHandler');
const interactionHandler = require('./src/bot/middleware/interactionHandler');

// Registrar comandos
bot.command('start', startHandler);
bot.command('menu', menuHandler);
bot.command('pedido', orderHandler);
bot.command('mipedido', myOrderHandler);

// Handler para callback queries (botones inline)
bot.on('callback_query', interactionHandler);

// Handler para mensajes de texto (no comandos)
bot.on('text', async (ctx) => {
  if (!ctx.message.text.startsWith('/')) {
    await orderHandler(ctx);
  }
});

// Handler para ubicaciones
bot.on('location', orderHandler);

// Handler para contactos (opcional)
bot.on('contact', async (ctx) => {
  const phoneNumber = ctx.message.contact.phone_number;
  await ctx.reply(
    `📞 Teléfono recibido: ${phoneNumber}\n\n` +
    'Gracias por compartir tu información.'
  );
});

// Manejo de errores del bot
bot.catch((err, ctx) => {
  console.error(`❌ [Bot Error] Update ${ctx.update.update_id}:`, err);
  try {
    ctx.reply(
      '❌ Ocurrió un error inesperado.\n\n' +
      'Por favor intenta nuevamente o contacta al restaurante.'
    ).catch(e => console.error('Error enviando mensaje de error:', e));
  } catch (replyError) {
    console.error('No se pudo enviar mensaje de error:', replyError);
  }
});

// ============================================
// INICIAR SERVIDOR Y BOT
// ============================================

let botLaunched = false;

async function launchBot() {
  if (botLaunched) {
    console.log('⚠️ Bot ya está en ejecución');
    return;
  }

  try {
    // Eliminar webhook y usar polling
    await bot.telegram.deleteWebhook();
    console.log('🗑️ Webhook eliminado (usando polling)');

    // Verificar conexión
    const botInfo = await bot.telegram.getMe();
    console.log(`✅ Bot conectado: @${botInfo.username} (ID: ${botInfo.id})`);

    // Configurar comandos en Telegram
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Iniciar conversación' },
      { command: 'menu', description: 'Ver menú completo' },
      { command: 'pedido', description: 'Hacer un pedido' },
      { command: 'mipedido', description: 'Ver estado de mi pedido' }
    ]);
    console.log('✅ Comandos registrados en Telegram');

    // Lanzar bot
    await bot.launch({
      dropPendingUpdates: true,
      allowedUpdates: ['message', 'callback_query', 'edited_message']
    });

    botLaunched = true;
    console.log('🤖 Bot iniciado correctamente en modo polling');

  } catch (error) {
    console.error('❌ Error al iniciar el bot:', error.message);
    
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.log('🔄 Problema de conexión. Reintentando en 10 segundos...');
      setTimeout(launchBot, 10000);
    } else if (error.response?.error_code === 409) {
      console.error('⚠️ Conflicto: el bot ya está corriendo en otro proceso o con webhook activo');
      console.log('Solución: Detén otros procesos del bot o espera 5 minutos');
    } else {
      throw error;
    }
  }
}

// Manejo de cierre graceful
process.once('SIGINT', () => {
  console.log('📴 Deteniendo bot (SIGINT)...');
  bot.stop('SIGINT');
  process.exit(0);
});

process.once('SIGTERM', () => {
  console.log('📴 Deteniendo bot (SIGTERM)...');
  bot.stop('SIGTERM');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // En producción, podrías querer reiniciar el proceso aquí
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Iniciar bot
  console.log('🤖 Iniciando bot de Telegram...');
  await launchBot();
});

module.exports = app;