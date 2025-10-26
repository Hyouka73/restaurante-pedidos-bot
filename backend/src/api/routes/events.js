// backend/src/api/routes/events.js
const express = require('express');
const router = express.Router();

let clients = [];

router.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);
    console.log(`[SSE] Cliente conectado: ${clientId}`);

    req.on('close', () => {
        clients = clients.filter(client => client.id !== clientId);
        console.log(`[SSE] Cliente desconectado: ${clientId}`);
    });
});

function sendSseEvent(data) {
    console.log('[SSE] Enviando evento a los clientes:', clients.length);
    clients.forEach(client => {
        client.res.write(`data: ${JSON.stringify(data)}

`);
    });
}

module.exports = { router, sendSseEvent };