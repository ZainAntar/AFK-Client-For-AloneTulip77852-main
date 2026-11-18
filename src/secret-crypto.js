const crypto = require('node:crypto');

function key() {
  const value = process.env.BOT_ENCRYPTION_KEY || '';
  return crypto.createHash('sha256').update(value).digest();
}

function encrypt(value) {
  if (!process.env.BOT_ENCRYPTION_KEY) throw new Error('BOT_ENCRYPTION_KEY eksik.');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decrypt(value) {
  if (!value) return '';
  if (!process.env.BOT_ENCRYPTION_KEY) throw new Error('BOT_ENCRYPTION_KEY eksik.');
  const [ivValue, tagValue, encryptedValue] = String(value).split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, 'base64url')),
    decipher.final()
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt };
