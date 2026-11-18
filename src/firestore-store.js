const admin = require('firebase-admin');
const { decrypt } = require('./secret-crypto');

function initializeFirebase() {
  if (admin.apps.length) return admin.app();

  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  } else {
    credential = admin.credential.applicationDefault();
  }
  return admin.initializeApp({ credential });
}

function sanitizeBot(data, id) {
  return {
    id,
    botName: String(data.botName || data.username || '').trim(),
    password: typeof data.password === 'string' ? decrypt(data.password) : '',
    host: String(data.host || '').trim(),
    port: Number(data.port) || 25565,
    version: String(data.version || '1.20.1').trim(),
    loginCommand: String(data.loginCommand || '/login').trim(),
    loginDelayMs: Number(data.loginDelayMs) || 1500,
    afterLoginCommands: Array.isArray(data.afterLoginCommands)
      ? data.afterLoginCommands.map(String).map((value) => value.trim()).filter(Boolean)
      : ['/boxmining', '/warp afk'],
    commandDelayMs: Number(data.commandDelayMs) || 2000,
    reconnectBaseDelayMs: Number(data.reconnectBaseDelayMs) || 5000,
    reconnectMaxDelayMs: Number(data.reconnectMaxDelayMs) || 60000,
    autoStart: data.autoStart !== false
  };
}

function configForBots(bots) {
  const first = bots[0] || {};
  return {
    host: first.host || 'localhost',
    port: first.port || 25565,
    version: first.version || '1.20.1',
    botNames: bots.map((bot) => bot.botName),
    botPasswords: bots.map((bot) => bot.password),
    botIds: bots.map((bot) => bot.id),
    loginCommand: first.loginCommand || '/login',
    loginDelayMs: first.loginDelayMs || 1500,
    afterLoginCommands: first.afterLoginCommands || ['/boxmining', '/warp afk'],
    commandDelayMs: first.commandDelayMs || 2000,
    reconnectBaseDelayMs: first.reconnectBaseDelayMs || 5000,
    reconnectMaxDelayMs: first.reconnectMaxDelayMs || 60000,
    botConfigs: bots.map((bot) => ({
      host: bot.host,
      port: bot.port,
      version: bot.version,
      loginCommand: bot.loginCommand,
      loginDelayMs: bot.loginDelayMs,
      afterLoginCommands: bot.afterLoginCommands,
      commandDelayMs: bot.commandDelayMs,
      reconnectBaseDelayMs: bot.reconnectBaseDelayMs,
      reconnectMaxDelayMs: bot.reconnectMaxDelayMs
    })),
    autoStart: bots.some((bot) => bot.autoStart),
    webHost: '127.0.0.1',
    webPort: 3210,
    workerApiToken: ''
  };
}

class FirestoreStore {
  constructor() {
    initializeFirebase();
    this.db = admin.firestore();
  }

  async listBots(uid) {
    const snapshot = await this.db.collection('users').doc(uid).collection('bots').get();
    return snapshot.docs
      .map((doc) => sanitizeBot(doc.data(), doc.id))
      .filter((bot) => bot.botName && bot.host)
      .sort((a, b) => a.botName.localeCompare(b.botName));
  }

  watchBots(onChange) {
    return this.db.collectionGroup('bots').onSnapshot((snapshot) => {
      const users = new Map();
      snapshot.forEach((doc) => {
        const parent = doc.ref.parent.parent;
        if (!parent) return;
        const uid = parent.id;
        if (!users.has(uid)) users.set(uid, []);
        users.get(uid).push(sanitizeBot(doc.data(), doc.id));
      });
      onChange(users);
    }, (error) => console.error('Firestore izleme hatası:', error.message));
  }
}

module.exports = { FirestoreStore, sanitizeBot, configForBots, initializeFirebase };
