// backend/src/config/firebase.js
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com` // IMPORTANTE: Configurar el bucket
});

const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket(); // Obtener el bucket por defecto

module.exports = { admin, db, storage, bucket };