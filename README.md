# 🍽️ Restaurante Pedidos Bot & Admin PWA

> **Tipo de proyecto:** Proyecto Práctico / Comercial  
> **Estado:** Listo para despliegue / Portfolio showcase  
> **Autor:** [Hyouka73](https://github.com/Hyouka73)

---

## 📖 Descripción del Proyecto

**Restaurante Pedidos Bot** es una solución omnicanal diseñada para automatizar la recepción, gestión y seguimiento de pedidos gastronómicos en tiempo real. 

Integra un **chatbot conversacional e interactivo en Telegram** (desarrollado con Telegraf) como canal directo para los comensales y una **Progressive Web App (PWA)** administrativa para el personal del restaurante y cocina, permitiendo gestionar el catálogo, coordinar pedidos en vivo y consultar proyecciones de ventas basadas en datos estadísticos cacheados en Redis.

---

## ⚡ Características Principales

- **Bot de Telegram Interactivo:**
  - Flujo completo de compra conversacional: bienvenida, exploración de categorías y menú con fotos y precios.
  - Generador de combos y selección de variantes/ingredientes personalizados mediante teclados inline (`InlineKeyboardMarkup`).
  - Carrito de compras reactivo en sesión (`@telegraf/session`) con cálculo automático de totales y confirmación.
  - Notificaciones automáticas de cambio de estado del pedido directamente al chat del cliente.
- **PWA de Administración y Cocina (KDS):**
  - Monitor de comandas y pedidos en tiempo real mediante Server-Sent Events (SSE).
  - Gestión integral del catálogo (platos, categorías, disponibilidad de stock y precios).
  - Configuración y validación del token del bot y credenciales en caliente desde la interfaz web.
- **Generación Dinámica de Códigos QR:**
  - Generación de códigos QR vinculados a mesas o mostradores para ordenar directamente desde el bot o web.
- **Analíticas y Proyección de Ventas:**
  - Cálculo de estimaciones y tendencias de venta utilizando algoritmos de regresión (`simple-statistics`).
  - Optimización de rendimiento con capa de caché en memoria de alta velocidad utilizando **Redis** (Upstash KV).

---

## 🛠️ Stack Tecnológico

### Backend & Chatbot
- **Runtime:** [Node.js](https://nodejs.org/) (Express 5)
- **Telegram Bot Framework:** [Telegraf 4](https://telegraf.js.org/) con arquitectura Webhook / Polling
- **Base de Datos:** [Firebase Firestore](https://firebase.google.com/) (Firebase Admin SDK)
- **Caché & Persistencia Rápida:** [Redis](https://redis.io/) / Upstash KV (`ioredis`)
- **Estadísticas & Utilidades:** `simple-statistics`, `qrcode`, `jsonwebtoken`, `multer`

### Frontend PWA
- **Framework:** [React 19](https://react.dev/) + [Vite 7](https://vitejs.dev/)
- **Estilos & UI:** [Tailwind CSS v4](https://tailwindcss.com/) + [DaisyUI 5](https://daisyui.com/), [Lucide React](https://lucide.dev/)
- **Visualización de Datos:** [Recharts](https://recharts.org/)
- **Mapas & Georreferenciación:** [Leaflet](https://leafletjs.com/) + `react-leaflet`
- **PWA:** `vite-plugin-pwa` (soporte offline y capacidad de instalación nativa)

---

## 🏛️ Estructura del Proyecto

```text
restaurante-pedidos-bot/
├── backend/                       # API REST Express + Bot Telegraf
│   ├── server.js                  # Punto de entrada y configuración de Express
│   ├── src/
│   │   ├── api/                   # Rutas REST (auth, config, pedidos, productos)
│   │   ├── bot/                   # Controladores, handlers y keyboards del bot
│   │   ├── services/              # Lógica de negocio, Firebase y Redis
│   │   └── utils/                 # Cifrado, formateadores y utilidades
│   └── .env.example               # Plantilla de variables de entorno
├── frontend-pwa/                  # Aplicación administrativa React + PWA
│   ├── src/
│   │   ├── components/            # Componentes reutilizables y Setup Wizard
│   │   ├── pages/                 # Dashboard, Comandas, Menú, Configuración
│   │   └── services/              # Cliente HTTP Axios y llamadas a la API
│   └── .env.example               # Plantilla de configuración frontend
└── README.md
```

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
- Node.js (v18 o superior)
- npm o pnpm
- Bot Token de Telegram (obtenido mediante [@BotFather](https://t.me/botfather))
- Instancia o credenciales de Firebase Firestore
- Instancia de Redis (local o URL de Upstash)

---

### 1. Configuración del Backend

1. Entra al directorio del backend:
   ```bash
   cd backend
   npm install
   ```
2. Crea el archivo de variables de entorno:
   ```bash
   cp .env.example .env
   ```
3. Configura tus credenciales en `backend/.env`:
   ```env
   PORT=3000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173

   # Telegram
   TELEGRAM_BOT_TOKEN=tu_token_de_botfather
   TELEGRAM_BOT_USERNAME=tu_bot_username

   # Firebase
   FIREBASE_PROJECT_ID=tu-proyecto
   FIREBASE_CLIENT_EMAIL=tu-email@tu-proyecto.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="tu_firebase_private_key_aqui"

   # Redis
   REDIS_URL=redis://localhost:6379

   # Seguridad
   JWT_SECRET=tu_jwt_secret_aleatorio
   ENCRYPTION_KEY=tu_clave_de_encriptacion
   ```
4. Inicia el backend en modo desarrollo:
   ```bash
   npm run start
   ```

---

### 2. Configuración del Frontend PWA

1. Entra al directorio del frontend:
   ```bash
   cd ../frontend-pwa
   npm install
   ```
2. Crea el archivo `.env`:
   ```bash
   cp .env.example .env
   ```
3. Ajusta la URL del backend en `frontend-pwa/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:5173`.

---

## 📄 Licencia
Distribuido bajo licencia [MIT](LICENSE). Código libre para uso personal y formativo.
