// backend/src/api/routes/events.js
const express = require('express');
const router = express.Router();

let clients = [];

router.get('/', (req, res) => {
    // ✅ Headers correctos para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // ✅ Nginx compatibility
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);
    console.log(`[SSE] Cliente conectado: ${clientId}. Total clientes: ${clients.length}`);

    // ✅ Enviar mensaje inicial de conexión
    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    // ✅ Keep-alive cada 30 segundos para mantener la conexión abierta
    const keepAliveInterval = setInterval(() => {
        res.write(`: keep-alive\n\n`);
    }, 30000);

    // ✅ Limpiar cuando el cliente se desconecta
    req.on('close', () => {
        clearInterval(keepAliveInterval);
        clients = clients.filter(client => client.id !== clientId);
        console.log(`[SSE] Cliente desconectado: ${clientId}. Total clientes: ${clients.length}`);
    });

    // ✅ Manejar errores
    req.on('error', (err) => {
        console.error(`[SSE] Error en cliente ${clientId}:`, err);
        clearInterval(keepAliveInterval);
        clients = clients.filter(client => client.id !== clientId);
    });
});

function sendSseEvent(data) {
    if (clients.length === 0) {
        console.log('[SSE] No hay clientes conectados, evento ignorado');
        return;
    }
    
    console.log(`[SSE] Enviando evento a ${clients.length} cliente(s):`, data.type);
    
    const message = `data: ${JSON.stringify(data)}\n\n`;
    
    clients.forEach((client, index) => {
        try {
            client.res.write(message);
        } catch (err) {
            console.error(`[SSE] Error enviando a cliente ${client.id}:`, err);
            // Remover cliente con error
            clients.splice(index, 1);
        }
    });
}

module.exports = { router, sendSseEvent };