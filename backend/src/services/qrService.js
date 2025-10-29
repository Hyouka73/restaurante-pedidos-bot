// backend/src/services/qrService.js
const QRCode = require('qrcode');
const { db } = require('../config/firebase');

class QrService {
  async generateRestaurantQr(restaurantId) {
      try {
        // 1. Validar restaurante
        const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
        
        if (!restaurantDoc.exists) {
          throw new Error('Restaurante no encontrado');
        }

        // 2. Obtener bot username
        const botUsername = process.env.TELEGRAM_BOT_USERNAME;
        
        if (!botUsername) {
          console.error('❌ TELEGRAM_BOT_USERNAME no configurado');
          throw new Error('El nombre del bot no está configurado. Contacta al administrador.');
        }

        // 3. Limpiar username (sin @)
        const cleanUsername = botUsername.replace('@', '');

        // 4. Crear deep link (¡Usamos https:// para máxima compatibilidad!)
        const deepLinkUrl = `https://t.me/${cleanUsername}?start=${restaurantId}`;

        // 5. Generar QR
        const qrDataUrl = await QRCode.toDataURL(deepLinkUrl, { 
          errorCorrectionLevel: 'H',
          width: 512,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        if (!qrDataUrl || !qrDataUrl.startsWith('data:image')) {
          throw new Error('Error generando imagen QR');
        }

        console.log(`✅ QR generado para ${restaurantId}`);

        return { 
          deepLinkUrl, 
          qrDataUrl,
          restaurantId,
          botUsername: cleanUsername,
          generatedAt: new Date().toISOString()
        };

      } catch (error) {
        console.error(`❌ Error QR (${restaurantId}):`, error.message);
        throw error;
      }
    }

  async validateBotConfig() {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME;
    
    if (!botUsername) {
      return {
        valid: false,
        error: 'TELEGRAM_BOT_USERNAME no configurado'
      };
    }

    const cleanUsername = botUsername.replace('@', '');
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
    
    if (!usernameRegex.test(cleanUsername)) {
      return {
        valid: false,
        username: cleanUsername,
        error: 'Formato de username inválido'
      };
    }

    return {
      valid: true,
      username: cleanUsername
    };
  }
}

module.exports = new QrService();