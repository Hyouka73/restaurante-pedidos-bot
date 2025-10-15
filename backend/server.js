require('dotenv').config();
const express = require('express');
const bot = require('./src/config/telegram');
const configRoutes = require('./src/api/routes/config');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Conectar rutas de API
app.use('/api/config', configRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Bot básico
bot.command('start', (ctx) => {
  ctx.reply('¡Hola! Soy tu asistente de pedidos 🍕');
});

// Start
bot.launch();
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Bot connected`);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));