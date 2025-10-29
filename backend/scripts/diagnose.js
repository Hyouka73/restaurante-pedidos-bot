// backend/scripts/diagnose.js
// USO: node scripts/diagnose.js

require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

async function diagnose() {
  console.log('🔍 DIAGNÓSTICO DEL BOT\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const checks = [];

  // 1. Variables de entorno
  console.log('1️⃣ VARIABLES DE ENTORNO:');
  console.log('─────────────────────────────────────────');
  
  const envVars = [
    'TELEGRAM_BOT_TOKEN',
    'WEBHOOK_URL',
    'KV_URL',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_STORAGE_BUCKET',
    'NODE_ENV',
    'FRONTEND_URL',
    'TOKEN_SECRET'
  ];

  for (const varName of envVars) {
    const value = process.env[varName];
    if (value) {
      const masked = varName.includes('TOKEN') || varName.includes('KEY') || varName.includes('URL')
        ? value.substring(0, 10) + '...' + value.substring(value.length - 4)
        : value;
      console.log(`✅ ${varName}: ${masked}`);
      checks.push({ name: varName, status: 'ok' });
    } else {
      console.log(`❌ ${varName}: NO CONFIGURADO`);
      checks.push({ name: varName, status: 'error' });
    }
  }
  console.log('');

  // 2. Token del bot
  console.log('2️⃣ TOKEN DEL BOT:');
  console.log('─────────────────────────────────────────');
  
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('❌ Token no configurado\n');
    checks.push({ name: 'Bot Token', status: 'error' });
  } else {
    try {
      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
      const me = await bot.telegram.getMe();
      console.log(`✅ Bot conectado: @${me.username} (${me.first_name})`);
      console.log(`   ID: ${me.id}`);
      checks.push({ name: 'Bot Connection', status: 'ok' });
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      checks.push({ name: 'Bot Connection', status: 'error' });
    }
  }
  console.log('');

  // 3. Webhook
  console.log('3️⃣ CONFIGURACIÓN DEL WEBHOOK:');
  console.log('─────────────────────────────────────────');
  
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log('⏭️  Saltando (token no configurado)\n');
  } else {
    try {
      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
      const info = await bot.telegram.getWebhookInfo();
      
      if (info.url) {
        console.log(`✅ Webhook configurado: ${info.url}`);
        console.log(`   Pendientes: ${info.pending_update_count}`);
        console.log(`   Max conexiones: ${info.max_connections || 40}`);
        
        if (info.last_error_date) {
          console.log(`   ⚠️  Último error: ${new Date(info.last_error_date * 1000).toLocaleString()}`);
          console.log(`      Mensaje: ${info.last_error_message}`);
          checks.push({ name: 'Webhook Status', status: 'warning' });
        } else {
          checks.push({ name: 'Webhook Status', status: 'ok' });
        }

        if (process.env.WEBHOOK_URL && info.url !== process.env.WEBHOOK_URL) {
          console.log(`   ⚠️  URL no coincide con WEBHOOK_URL en .env`);
          console.log(`      Esperado: ${process.env.WEBHOOK_URL}`);
          console.log(`      Actual:   ${info.url}`);
        }
      } else {
        console.log('⚠️  No hay webhook configurado (modo polling)');
        checks.push({ name: 'Webhook Config', status: 'warning' });
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      checks.push({ name: 'Webhook Check', status: 'error' });
    }
  }
  console.log('');

  // 4. Redis
  console.log('4️⃣ CONEXIÓN REDIS:');
  console.log('─────────────────────────────────────────');
  
  if (!process.env.KV_URL) {
    console.log('❌ KV_URL no configurado\n');
    checks.push({ name: 'Redis Config', status: 'error' });
  } else {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(process.env.KV_URL);
      
      await redis.ping();
      console.log('✅ Redis conectado correctamente');
      
      await redis.set('test_key', 'test_value', 'EX', 10);
      const value = await redis.get('test_key');
      
      if (value === 'test_value') {
        console.log('✅ Operaciones de lectura/escritura funcionando');
        checks.push({ name: 'Redis Connection', status: 'ok' });
      } else {
        console.log('⚠️  Error en lectura/escritura');
        checks.push({ name: 'Redis Operations', status: 'warning' });
      }
      
      await redis.quit();
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      checks.push({ name: 'Redis Connection', status: 'error' });
    }
  }
  console.log('');

  // 5. Endpoint del webhook
  console.log('5️⃣ ENDPOINT DEL WEBHOOK:');
  console.log('─────────────────────────────────────────');
  
  if (!process.env.WEBHOOK_URL) {
    console.log('⏭️  Saltando (WEBHOOK_URL no configurado)\n');
  } else {
    try {
      const healthUrl = process.env.WEBHOOK_URL.replace('/api/webhook', '/health');
      const response = await axios.get(healthUrl, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log('✅ Endpoint accesible');
        console.log(`   Health check: ${JSON.stringify(response.data, null, 2)}`);
        checks.push({ name: 'Endpoint Accessible', status: 'ok' });
      } else {
        console.log(`⚠️  Respuesta inesperada: ${response.status}`);
        checks.push({ name: 'Endpoint Response', status: 'warning' });
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('⚠️  Servidor no accesible (¿está corriendo?)');
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
      checks.push({ name: 'Endpoint Check', status: 'error' });
    }
  }
  console.log('');

  // 6. Firebase
  console.log('6️⃣ FIREBASE:');
  console.log('─────────────────────────────────────────');
  
  const firebaseVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
  const allFirebaseConfigured = firebaseVars.every(v => process.env[v]);
  
  if (!allFirebaseConfigured) {
    console.log('❌ Configuración incompleta');
    checks.push({ name: 'Firebase Config', status: 'error' });
  } else {
    try {
      const admin = require('firebase-admin');
      
      // Verificar si ya está inicializado
      let app;
      try {
        app = admin.app();
      } catch (e) {
        app = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          })
        });
      }
      
      const db = admin.firestore();
      await db.collection('_test').limit(1).get();
      
      console.log('✅ Firebase conectado correctamente');
      console.log(`   Proyecto: ${process.env.FIREBASE_PROJECT_ID}`);
      checks.push({ name: 'Firebase Connection', status: 'ok' });
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      checks.push({ name: 'Firebase Connection', status: 'error' });
    }
  }
  console.log('');

  // Resumen
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📊 RESUMEN:');
  console.log('─────────────────────────────────────────');
  
  const okCount = checks.filter(c => c.status === 'ok').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const errorCount = checks.filter(c => c.status === 'error').length;
  
  console.log(`✅ OK:       ${okCount}`);
  console.log(`⚠️  Avisos:  ${warningCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log('');

  if (errorCount > 0) {
    console.log('❌ HAY ERRORES CRÍTICOS');
    console.log('\n💡 Revisa los puntos marcados con ❌ arriba.');
  } else if (warningCount > 0) {
    console.log('⚠️  TODO FUNCIONAL PERO HAY AVISOS');
    console.log('\n💡 Revisa los puntos marcados con ⚠️  arriba.');
  } else {
    console.log('🎉 ¡TODO PERFECTO!');
    console.log('\n✨ Tu bot está listo para funcionar.');
  }
  
  console.log('');
  process.exit(errorCount > 0 ? 1 : 0);
}

diagnose();