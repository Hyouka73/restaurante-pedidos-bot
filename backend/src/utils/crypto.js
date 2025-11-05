// backend/src/utils/crypto.js
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended 12 bytes
const AUTH_TAG_LENGTH = 16; // GCM auth tag is always 16 bytes

function getKey() {
  const secret = process.env.TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('TOKEN_SECRET env var must be set and at least 32 chars long');
  }
  // Use SHA-256 hash to derive a consistent 32-byte key
  return crypto.createHash('sha256').update(secret).digest();
}

/*
function encryptToken(plain) {
  try {
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Store as base64: iv:tag:cipher
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
  } catch (error) {
    console.error('❌ Error encrypting token:', error);
    throw new Error('Encryption failed: ' + error.message);
  }
}

function decryptToken(enc) {
  try {
    const key = getKey();
    
    // Validar que enc es una cadena base64 válida
    if (!enc || typeof enc !== 'string') {
      throw new Error('Invalid encrypted token format: must be a non-empty string');
    }

    let buffer;
    try {
      buffer = Buffer.from(enc, 'base64');
    } catch (err) {
      throw new Error('Invalid base64 encoding');
    }

    // Validar longitud mínima del buffer
    const minLength = IV_LENGTH + AUTH_TAG_LENGTH;
    if (buffer.length < minLength) {
      throw new Error(`Invalid token length: expected at least ${minLength} bytes, got ${buffer.length}`);
    }

    // Extraer componentes
    const iv = buffer.slice(0, IV_LENGTH);
    const tag = buffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);

    // Validar que tenemos datos para desencriptar
    if (ciphertext.length === 0) {
      throw new Error('No ciphertext found in encrypted token');
    }

    // Desencriptar
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    
    let plain;
    try {
      plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch (err) {
      // Este es el error más común cuando el TOKEN_SECRET no coincide
      throw new Error('Decryption failed - possibly wrong TOKEN_SECRET or corrupted data');
    }

    return plain;
  } catch (error) {
    console.error('❌ Error decrypting token:', error.message);
    throw error; // Re-lanzar el error con el mensaje específico
  }
}

// Función auxiliar para validar formato sin desencriptar
function validateEncryptedFormat(enc) {
  if (!enc || typeof enc !== 'string') {
    return { valid: false, error: 'Not a string' };
  }

  try {
    const buffer = Buffer.from(enc, 'base64');
    const minLength = IV_LENGTH + AUTH_TAG_LENGTH;
    
    if (buffer.length < minLength) {
      return { 
        valid: false, 
        error: `Too short: ${buffer.length} bytes (min: ${minLength})` 
      };
    }

    return { 
      valid: true, 
      bufferLength: buffer.length,
      ivLength: IV_LENGTH,
      tagLength: AUTH_TAG_LENGTH,
      ciphertextLength: buffer.length - IV_LENGTH - AUTH_TAG_LENGTH
    };
  } catch (err) {
    return { valid: false, error: 'Invalid base64' };
  }
}

function hmacToken(token) {
  const secret = process.env.TOKEN_SECRET || 'fallback-secret';
  return crypto.createHmac('sha256', secret).update(token).digest('hex');
}
*/

module.exports = {
  // encryptToken,
  // decryptToken,
  // hmacToken,
  // validateEncryptedFormat
};