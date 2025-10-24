// backend/src/services/botService.js
const { Telegraf } = require('telegraf');
const { db } = require('../config/firebase');
const cryptoUtils = require('../utils/crypto');
const sharedBot = require('../config/telegram');

class BotService {
  constructor() {
    this.bots = new Map();
    this._sharedHookAttached = false;
    this.initializationRetries = new Map();
  }

  async initBot(restaurantId) {
    try {
      // Si ya existe, retornar
      if (this.bots.has(restaurantId)) {
        console.log(`ℹ️ Bot para ${restaurantId} ya está inicializado`);
        return true;
      }

      // Obtener configuración del restaurante
      const doc = await db.collection('restaurants').doc(restaurantId).get();
      if (!doc.exists) throw new Error('Restaurante no encontrado');
      
      const data = doc.data();
      const enc = data?.info?.telegramToken;
      if (!enc) throw new Error('Token no configurado');

      // Desencriptar token
      const token = cryptoUtils.decryptToken(enc);

      // Verificar si es el bot compartido
      const envToken = process.env.TELEGRAM_BOT_TOKEN;
      if (envToken && token === envToken) {
        console.log(`ℹ️ Usando bot compartido para restaurante ${restaurantId}`);
        
        if (!this._sharedHookAttached) {
          sharedBot.catch((err, ctx) => {
            console.error(`Error en bot compartido:`, err);
            try { 
              ctx.reply('Hubo un error al procesar tu mensaje. Por favor intenta nuevamente.'); 
            } catch (e) { 
              console.error('Error enviando mensaje de error:', e);
            }
          });
          this._sharedHookAttached = true;
        }

        this.bots.set(restaurantId, { bot: sharedBot, isShared: true });
        return true;
      }

      // Crear nueva instancia con retry logic
      const bot = await this._createBotWithRetry(token, restaurantId);
      
      // Configurar handlers básicos
      bot.catch((err, ctx) => {
        console.error(`Error en bot ${restaurantId}:`, err);
        try { 
          ctx.reply('Hubo un error al procesar tu mensaje. Por favor intenta nuevamente.'); 
        } catch (e) { 
          console.error('Error enviando mensaje de error:', e);
        }
      });

      // Guardar instancia
      this.bots.set(restaurantId, { bot, isShared: false });

      // Iniciar bot con manejo de errores
      try {
        await bot.launch({
          dropPendingUpdates: true,
        });
        console.log(`✅ Bot para restaurante ${restaurantId} iniciado correctamente`);
      } catch (launchError) {
        console.error(`Error al lanzar bot ${restaurantId}:`, launchError);
        this.bots.delete(restaurantId);
        throw new Error(`No se pudo iniciar el bot: ${launchError.message}`);
      }

      return true;
    } catch (error) {
      console.error(`Error iniciando bot ${restaurantId}:`, error);
      throw error;
    }
  }

  async _createBotWithRetry(token, restaurantId, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const bot = new Telegraf(token);
        
        // Verificar conexión con timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout conectando a Telegram API')), 10000)
        );
        
        const getMePromise = bot.telegram.getMe();
        
        const botInfo = await Promise.race([getMePromise, timeoutPromise]);
        
        console.log(`✅ Bot conectado: @${botInfo.username} (ID: ${botInfo.id})`);
        return bot;
      } catch (error) {
        console.error(`Intento ${i + 1}/${maxRetries} falló:`, error.message);
        
        if (i === maxRetries - 1) {
          throw new Error(
            `No se pudo conectar a Telegram API después de ${maxRetries} intentos. ` +
            `Verifica tu conexión a internet y que el token sea válido.`
          );
        }
        
        // Esperar antes de reintentar (backoff exponencial)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  async stopBot(restaurantId) {
    const entry = this.bots.get(restaurantId);
    if (entry) {
      try {
        if (entry.isShared) {
          this.bots.delete(restaurantId);
          console.log(`ℹ️ Desregistrado restaurante ${restaurantId} del bot compartido`);
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
      await bot.telegram.deleteWebhook();

      if (url) {
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

  isRunning(restaurantId) {
    return this.bots.has(restaurantId);
  }

  async getStatus(restaurantId) {
    let processRunning = false;
    let dbEnabled = false;
    let dbError = null;

    // 1. Obtener estado de la base de datos (features.botEnabled)
    try {
      const doc = await db.collection('restaurants').doc(restaurantId).get();
      if (doc.exists) {
        const data = doc.data();
        // Default a false si 'features' o 'botEnabled' no existen
        dbEnabled = data.features?.botEnabled ?? false;
      } else {
        dbError = 'Restaurant document not found';
      }
    } catch (err) {
      console.error(`Error obteniendo estado DB del bot ${restaurantId}:`, err);
      dbError = err.message;
    }

    // 2. Obtener estado del proceso (si está en el Map)
    try {
      const entry = this.bots.get(restaurantId);
      processRunning = !!entry;

      if (!processRunning) {
        // Proceso no corre, devolver estado
        return { running: false, enabled: dbEnabled, error: dbError };
      }

      // Proceso SÍ corre, obtener info del webhook
      const bot = entry.bot;
      const webhookInfo = await bot.telegram.getWebhookInfo();
      
      return {
        running: true,
        enabled: dbEnabled, // <-- CAMBIO: Añadir estado de la DB
        webhook: webhookInfo.url || null,
        pendingUpdates: webhookInfo.pending_update_count,
        isShared: entry.isShared
      };

    } catch (error) {
      console.error(`Error obteniendo estado del proceso del bot ${restaurantId}:`, error);
      // Devolver estado DB aunque el proceso falle
      return { running: false, enabled: dbEnabled, error: error.message };
    }
  }
}

module.exports = new BotService();