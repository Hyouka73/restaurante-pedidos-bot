const Redis = require('ioredis');

// Reutilizamos la misma configuración de server.js
const redisOptions = {
  url: process.env.KV_URL,
  config: {
    tls: {},
    connectTimeout: 15000,
    commandTimeout: 8000,
  },
  lazyConnect: false
};

// Creamos un cliente "Publicador" que podemos reutilizar
const publisher = new Redis(redisOptions.url, redisOptions.config);

// Exportamos el publicador y una FUNCIÓN para crear nuevos suscriptores
// (Los suscriptores no se pueden reutilizar de la misma forma)
module.exports = {
  publisher,
  createSubscriber: () => new Redis(redisOptions.url, redisOptions.config)
};