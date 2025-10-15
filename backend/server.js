require('dotenv').config();
const express = require('express');
const bot = require('./src/config/telegram');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Conectar rutas de API
const configRoutes = require('./src/api/routes/config');
const authRoutes = require('./src/api/routes/auth');
app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Bot - Conectar handlers
const startHandler = require('./src/bot/handlers/startHandler');
bot.command('start', startHandler);

// Start
bot.launch();
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Bot connected`);
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));