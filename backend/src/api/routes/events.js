// backend/src/api/routes/events.js
const express = require('express');
const router = express.Router();
const { createSubscriber } = require('../../config/redisClient');

const SSE_CHANNEL = 'orders_channel';

router.get('/', (req, res) => {
    // 1. Establecer cabeceras SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    
    console.log(`[SSE] Nuevo cliente conectado. Suscribiendo a ${SSE_CHANNEL}`);

    // 2. Crear un NUEVO suscriptor de Redis para esta conexión
    const subscriber = createSubscriber();
    subscriber.subscribe(SSE_CHANNEL);

    // 3. Enviar mensaje de conexión
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    
    // 4. Cuando Redis nos da un mensaje, se lo pasamos al cliente
    subscriber.on('message', (channel, message) => {
        if (channel === SSE_CHANNEL) {
            try {
                res.write(`data: ${message}\n\n`);
            } catch (err) {
                console.error('[SSE] Error escribiendo en cliente (probablemente desconectado):', err);
            }
        }
    });

    // 5. Keep-alive para prevenir timeouts de red/proxy
    const keepAliveInterval = setInterval(() => {
        res.write(`: keep-alive\n\n`);
    }, 30000);

    // 6. Limpiar cuando el cliente se desconecta
    req.on('close', () => {
        clearInterval(keepAliveInterval);
        subscriber.unsubscribe(SSE_CHANNEL);
        subscriber.quit();
        console.log(`[SSE] Cliente desconectado. Desuscribiendo.`);
    });
});

module.exports = { router };