require('dotenv').config();
const cors = require('cors');
const express = require('express');
const bot = require('./src/config/telegram');

const app = express();
const PORT = process.env.PORT || 3000;

// --- AGREGAR ESTO PARA CONFIGURAR CORS ---
// Opción 1: Configuración básica y permisiva para desarrollo
// const corsOptions = {
//   origin: 'http://localhost:5173', // Solo permitir solicitudes desde el frontend
//   credentials: true // Permitir el envío de cookies/headers de autenticación
// };
// app.use(cors(corsOptions));

// Opción 2: Permitir todos los orígenes (SOLO PARA DESARROLLO!)
// Usa esta opción si estás probando cosas rápidamente, pero cámbiala antes de producción.
app.use(cors()); // <-- AGREGAR ESTA LINEA

// --- FIN CONFIGURACIÓN CORS ---

// Middleware
app.use(express.json());

// Conectar rutas de API
const configRoutes = require('./src/api/routes/config');
const authRoutes = require('./src/api/routes/auth');
const menuRoutes = require('./src/api/routes/menu'); // Nuevo
const ordersRoutes = require('./src/api/routes/orders'); // Nuevo
app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes); // Nuevo
app.use('/api/orders', ordersRoutes); // Nuevo

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Bot - Conectar handlers
const startHandler = require('./src/bot/handlers/startHandler');
const menuHandler = require('./src/bot/handlers/menuHandler');
const orderHandler = require('./src/bot/handlers/orderHandler');

bot.command('start', startHandler);
bot.command('menu', menuHandler);
bot.command('pedido', orderHandler);

// Conectar middleware de interacciones (botones inline)
const interactionHandler = require('./src/bot/middleware/interactionHandler');
bot.on('callback_query', interactionHandler);

// Start
bot.launch();
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Bot connected`);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));