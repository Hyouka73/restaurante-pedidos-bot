// backend/scripts/setup-webhook.js
// USO: node scripts/setup-webhook.js

require('dotenv').config();
const { Telegraf } = require('telegraf');

async function setupWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.WEBHOOK_URL;

  if (!token) {
    console.error('❌ TELEGRAM_BOT_TOKEN no encontrado en .env');
    process.exit(1);
  }

  if (!webhookUrl) {
    console.error('❌ WEBHOOK_URL no encontrado en .env');
    console.log('💡 Agrega esta línea a tu .env:');
    console.log('   WEBHOOK_URL=https://restbot-backend.vercel.app/api/webhook');
    process.exit(1);
  }

  const bot = new Telegraf(token);
  
  console.log('🔧 Configurando webhook...');
  console.log('📍 URL:', webhookUrl);
  console.log('');

  try {
    // 1. Eliminar webhook anterior
    console.log('🗑️  Eliminando webhook anterior...');
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    console.log('✅ Webhook anterior eliminado');
    console.log('');

    // 2. Configurar nuevo webhook
    console.log('⚙️  Configurando nuevo webhook...');
    const result = await bot.telegram.setWebhook(webhookUrl, {
      drop_pending_updates: true,
      allowed_updates: [
        'message',
        'callback_query',
        'edited_message'
      ]
    });

    if (result) {
      console.log('✅ Webhook configurado exitosamente');
      console.log('');

      // 3. Verificar configuración
      console.log('🔍 Verificando configuración...');
      const info = await bot.telegram.getWebhookInfo();
      
      console.log('');
      console.log('📊 INFORMACIÓN DEL WEBHOOK:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  URL:                ', info.url);
      console.log('  Pendientes:         ', info.pending_update_count);
      console.log('  Max conexiones:     ', info.max_connections || 40);
      console.log('  Actualizaciones:    ', info.allowed_updates?.join(', ') || 'Todas');
      console.log('');
      
      if (info.last_error_date) {
        console.log('⚠️  ÚLTIMO ERROR:');
        console.log('  Fecha:             ', new Date(info.last_error_date * 1000).toLocaleString());
        console.log('  Mensaje:           ', info.last_error_message);
        console.log('');
      }

      if (info.url !== webhookUrl) {
        console.log('⚠️  ADVERTENCIA: El webhook configurado no coincide');
        console.log('  Esperado:', webhookUrl);
        console.log('  Actual:  ', info.url);
      } else {
        console.log('✅ Todo correcto');
      }
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('🎉 Configuración completada');
      console.log('');
      console.log('📝 PRÓXIMOS PASOS:');
      console.log('   1. Envía un mensaje a tu bot en Telegram');
      console.log('   2. Verifica los logs en Vercel Dashboard');
      console.log('   3. Ejecuta: npm run check-webhook');
      console.log('');
      
    } else {
      console.error('❌ Error al configurar webhook');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('');
    console.error('💡 POSIBLES CAUSAS:');
    console.error('   • Token de bot inválido');
    console.error('   • URL de webhook inaccesible');
    console.error('   • Problema de red');
    console.error('');
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
setupWebhook();