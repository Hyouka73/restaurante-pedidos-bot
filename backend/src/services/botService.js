// backend/src/services/botService.js
const { Telegraf } = require('telegraf');
const { db } = require('../config/firebase');
const cryptoUtils = require('../utils/crypto');
const sharedBot = require('../config/telegram');

class BotService {
  constructor() {
    // Map: restaurantId -> { bot: TelegrafInstance, isShared: boolean }
    this.bots = new Map();
  }

  async initBot(restaurantId) {
    try {
      // Si ya existe una instancia, la detenemos
      if (this.bots.has(restaurantId)) {
        // If already initialized for this restaurant, do nothing
        return true;
      }

      // Obtener token encriptado
      const doc = await db.collection('restaurants').doc(restaurantId).get();
      if (!doc.exists) throw new Error('Restaurante no encontrado');
      
      const data = doc.data();
      const enc = data?.info?.telegramToken;
      if (!enc) throw new Error('Token no configurado');

      // Desencriptar token
      const token = cryptoUtils.decryptToken(enc);

      // If token matches the global token in env, reuse the shared bot instance
      const envToken = process.env.TELEGRAM_BOT_TOKEN;
      if (envToken && token === envToken) {
        console.log(`ℹ️ Usando bot compartido para restaurante ${restaurantId}`);
        // Attach simple catcher to shared bot if not already present
        if (!this._sharedHookAttached) {
          sharedBot.catch((err, ctx) => {
            console.error(`Error en bot compartido:`, err);
            try { ctx.reply('Hubo un error al procesar tu mensaje.'); } catch (e) { /* ignore */ }
          });
          this._sharedHookAttached = true;
        }

        this.bots.set(restaurantId, { bot: sharedBot, isShared: true });
        // Do NOT launch or stop the shared bot here; server.js controls it
        return true;
      }

      // Crear nueva instancia de bot para token específico
      const bot = new Telegraf(token);

      // Configurar handlers básicos (los específicos se configuran desde server.js)
      bot.catch((err, ctx) => {
        console.error(`Error en bot ${restaurantId}:`, err);
        try { ctx.reply('Hubo un error al procesar tu mensaje.'); } catch (e) { /* ignore */ }
      });

      // Guardar instancia
      this.bots.set(restaurantId, { bot, isShared: false });

      // Iniciar bot
      await bot.launch();
      console.log(`✅ Bot para restaurante ${restaurantId} iniciado`);

      return true;
    } catch (error) {
      console.error(`Error iniciando bot ${restaurantId}:`, error);
      throw error;
    }
  }

  async stopBot(restaurantId) {
    const entry = this.bots.get(restaurantId);
    if (entry) {
      try {
        if (entry.isShared) {
          // Do not stop the globally shared bot from here
          this.bots.delete(restaurantId);
          console.log(`ℹ️ Desregistrado restaurante ${restaurantId} del bot compartido (no se detiene el bot global)`);
          return true;
        }

        await entry.bot.stop('STOP');
        this.bots.delete(restaurantId);
        console.log(`✅ Bot para restaurante ${restaurantId} detenido`);
        return true;
      } catch (error) {
        console.error(`Error deteniendo bot ${restaurantId}:`, error);
        throw error;
      }
    }
    return false;
  }

  getBot(restaurantId) {
    const entry = this.bots.get(restaurantId);
    return entry ? entry.bot : null;
  }

  async configureWebhook(restaurantId, url) {
    const entry = this.bots.get(restaurantId);
    if (!entry) throw new Error('Bot no iniciado');

    const bot = entry.bot;
    try {
      // Primero eliminamos webhook existente
      await bot.telegram.deleteWebhook();

      if (url) {
        // Configurar nuevo webhook
        await bot.telegram.setWebhook(`${url}/webhook/${restaurantId}`);
        console.log(`✅ Webhook configurado para ${restaurantId} en ${url}`);
      } else {
        console.log(`✅ Webhook eliminado para ${restaurantId}, usando polling`);
      }

      return true;
    } catch (error) {
      console.error(`Error configurando webhook para ${restaurantId}:`, error);
      throw error;
    }
  }

  // Helpers para obtener estado
  isRunning(restaurantId) {
    return this.bots.has(restaurantId);
  }

  async getStatus(restaurantId) {
    try {
      const entry = this.bots.get(restaurantId);
      if (!entry) return { running: false };

      const bot = entry.bot;
      const webhookInfo = await bot.telegram.getWebhookInfo();
      return {
        running: true,
        webhook: webhookInfo.url || null,
        pendingUpdates: webhookInfo.pending_update_count
      };
    } catch (error) {
      console.error(`Error obteniendo estado del bot ${restaurantId}:`, error);
      return { running: false, error: error.message };
    }
  }
}

// Exportar instancia singleton
module.exports = new BotService();