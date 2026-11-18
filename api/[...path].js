const admin = require('firebase-admin');
const { encrypt } = require('../src/secret-crypto');

function initializeFirebase() {
  if (admin.apps.length) return admin.app();
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
    });
  }
  return admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 4096) reject(new Error('İstek gövdesi çok büyük.'));
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function json(response, status, value, headers = {}) {
  response.status(status).set({ 'Content-Type': 'application/json; charset=utf-8', ...headers }).send(JSON.stringify(value));
}

module.exports = async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/api/firebase-config' && request.method === 'GET') {
    if (!process.env.FIREBASE_WEB_CONFIG_JSON) {
      json(response, 500, { error: 'FIREBASE_WEB_CONFIG_JSON eksik.' });
      return;
    }
    try {
      json(response, 200, JSON.parse(process.env.FIREBASE_WEB_CONFIG_JSON));
    } catch {
      json(response, 500, { error: 'FIREBASE_WEB_CONFIG_JSON geçersiz JSON.' });
    }
    return;
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    json(response, 500, { error: 'Firebase Admin kimlik bilgileri eksik.' });
    return;
  }

  let decoded;
  try {
    initializeFirebase();
    const authorization = request.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) throw new Error('Oturum gerekli.');
    decoded = await admin.auth().verifyIdToken(authorization.slice(7));
  } catch (error) {
    json(response, 401, { error: 'Google oturumu gerekli.' });
    return;
  }

  const db = admin.firestore();
  const botCollection = db.collection('users').doc(decoded.uid).collection('bots');

  if (path === '/api/config' && request.method === 'GET') {
    const snapshot = await botCollection.orderBy('botName').get();
    const bots = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      password: undefined
    })).map(({ password, ...bot }) => bot);
    json(response, 200, { bots });
    return;
  }

  if (path === '/api/config' && request.method === 'POST') {
    try {
      const body = JSON.parse(await readBody(request));
      if (!body.botName || !body.host) throw new Error('Bot adı ve sunucu gereklidir.');
      if (body.botName.length > 64 || body.host.length > 253) throw new Error('Geçersiz bot adı veya sunucu.');
      const count = await botCollection.count().get();
      if (!body.id && count.data().count >= 5) throw new Error('En fazla 5 bot eklenebilir.');
      const id = body.id || botCollection.doc().id;
      const data = {
        botName: body.botName.trim(),
        host: body.host.trim(),
        port: Number(body.port) || 25565,
        version: body.version || '1.20.1',
        loginCommand: body.loginCommand || '/login',
        loginDelayMs: Number(body.loginDelayMs) || 1500,
        afterLoginCommands: Array.isArray(body.afterLoginCommands) ? body.afterLoginCommands : [],
        commandDelayMs: Number(body.commandDelayMs) || 2000,
        reconnectBaseDelayMs: Number(body.reconnectBaseDelayMs) || 5000,
        reconnectMaxDelayMs: Number(body.reconnectMaxDelayMs) || 60000,
        autoStart: body.autoStart !== false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      if (typeof body.password === 'string' && body.password.length > 0) data.password = encrypt(body.password);
      await botCollection.doc(id).set(data, { merge: true });
      json(response, 200, { id });
    } catch (error) {
      json(response, 400, { error: error.message });
    }
    return;
  }

  const deleteMatch = path.match(/^\/api\/config\/([^/]+)$/);
  if (deleteMatch && request.method === 'DELETE') {
    await botCollection.doc(decodeURIComponent(deleteMatch[1])).delete();
    json(response, 200, { ok: true });
    return;
  }

  if (!process.env.WORKER_URL || !process.env.WORKER_API_TOKEN) {
    json(response, 500, { error: 'Railway worker ortam değişkenleri eksik.' });
    return;
  }

  const target = new URL(path + new URL(request.url, 'http://localhost').search, process.env.WORKER_URL);
  const headers = {
    Authorization: `Bearer ${process.env.WORKER_API_TOKEN}`,
    'X-Afk-User': decoded.uid
  };
  let body;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await readBody(request);
    headers['Content-Type'] = request.headers['content-type'] || 'application/json';
  }
  const upstream = await fetch(target, { method: request.method, headers, body });
  const text = await upstream.text();
  response.status(upstream.status).set('Content-Type', upstream.headers.get('content-type') || 'application/json').send(text);
};
