const http = require('node:http');
const { URL } = require('node:url');

function writeJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 4096) {
        request.destroy();
        reject(new Error('İstek gövdesi çok büyük.'));
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

class WorkerApi {
  constructor(managers, config) {
    this.managers = managers;
    this.config = config;
    this.server = null;
  }

  managerFor(request) {
    if (this.managers.size === 1 && this.managers.has('local')) return this.managers.get('local');
    const uid = String(request.headers['x-afk-user'] || '');
    return uid ? this.managers.get(uid) : null;
  }

  isAuthorized(request) {
    if (!this.config.workerApiToken) return process.env.NODE_ENV !== 'production';
    return request.headers.authorization === `Bearer ${this.config.workerApiToken}`;
  }

  start() {
    this.server = http.createServer(async (request, response) => {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

      if (request.method === 'GET' && url.pathname === '/health') {
        writeJson(response, 200, { ok: true });
        return;
      }
      if (!this.isAuthorized(request)) {
        writeJson(response, 401, { error: 'Yetkisiz istek.' });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/state') {
        const manager = this.managerFor(request);
        if (!manager) {
          writeJson(response, 200, { host: '', port: 0, version: '', activeCount: 0, bots: [] });
          return;
        }
        writeJson(response, 200, {
          host: manager.bots[0]?.connectionOptions.host || '',
          port: manager.bots[0]?.connectionOptions.port || 0,
          version: manager.bots[0]?.connectionOptions.version || '',
          activeCount: manager.activeCount,
          bots: manager.snapshots
        });
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/logs') {
        const manager = this.managerFor(request);
        writeJson(response, 200, { logs: manager ? manager.getLogs(url.searchParams.get('limit')) : [] });
        return;
      }

      const actionMatch = url.pathname.match(/^\/api\/(bots\/(\d+)|(all))\/(start|stop)$/);
      if (request.method === 'POST' && actionMatch) {
        const manager = this.managerFor(request);
        if (!manager) {
          writeJson(response, 404, { error: 'Kullanıcının bot yapılandırması yok.' });
          return;
        }
        if (actionMatch[3] === 'all') {
          actionMatch[4] === 'start' ? manager.startAll() : manager.stopAll();
        } else {
          const index = Number(actionMatch[2]) - 1;
          actionMatch[4] === 'start' ? manager.start(index) : manager.stop(index);
        }
        writeJson(response, 200, { ok: true });
        return;
      }

      const chatMatch = url.pathname.match(/^\/api\/bots\/(\d+)\/chat$/);
      if (request.method === 'POST' && chatMatch) {
        try {
          const manager = this.managerFor(request);
          if (!manager) {
            writeJson(response, 404, { error: 'Bot yapılandırması bulunamadı.' });
            return;
          }
          const body = JSON.parse(await readBody(request));
          const message = typeof body.message === 'string' ? body.message.trim() : '';
          if (!message || message.length > 256) {
            writeJson(response, 400, { error: 'Mesaj 1-256 karakter arasında olmalıdır.' });
            return;
          }
          if (!manager.sendChat(Number(chatMatch[1]) - 1, message)) {
            writeJson(response, 409, { error: 'Bot bağlı değil.' });
            return;
          }
          writeJson(response, 200, { ok: true });
        } catch (error) {
          writeJson(response, 400, { error: error.message });
        }
        return;
      }

      writeJson(response, 404, { error: 'Bulunamadı.' });
    });

    this.server.listen(this.config.webPort, this.config.webHost);
    return this.server;
  }

  stop() {
    if (this.server) this.server.close();
  }
}

module.exports = { WorkerApi };
