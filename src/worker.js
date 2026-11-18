const { loadConfig } = require('./config');
const { BotManager } = require('./bot-manager');
const { WorkerApi } = require('./worker-api');
const { FirestoreStore, configForBots } = require('./firestore-store');

async function main() {
  const baseConfig = loadConfig();
  const managers = new Map();
  const managerConfigs = new Map();
  let store = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    store = new FirestoreStore();
  }

  const reconcile = (users) => {
    const currentIds = new Set(users instanceof Map ? users.keys() : []);
    for (const uid of managers.keys()) {
      if (!currentIds.has(uid)) {
        managers.get(uid).stopAll();
        managers.delete(uid);
        managerConfigs.delete(uid);
      }
    }
    if (!(users instanceof Map)) return;
    users.forEach((bots, uid) => {
      if (!bots.length) {
        if (managers.has(uid)) {
          managers.get(uid).stopAll();
          managers.delete(uid);
        }
        return;
      }
      const config = configForBots(bots);
      const old = managers.get(uid);
      const signature = JSON.stringify(config);
      if (old && managerConfigs.get(uid) === signature) return;
      if (old) old.stopAll();
      const manager = new BotManager(config);
      managers.set(uid, manager);
      managerConfigs.set(uid, signature);
      if (config.autoStart) manager.startAll();
    });
  };

  if (store) {
    store.watchBots(reconcile);
  } else {
    if (!baseConfig.botNames.length) {
      console.error('BOT_NAMES tanımlı değil ve Firebase ayarları bulunamadı.');
      process.exitCode = 1;
      return;
    }
    const localManager = new BotManager(baseConfig);
    managers.set('local', localManager);
    if (baseConfig.autoStart) localManager.startAll();
  }

  const api = new WorkerApi(managers, baseConfig);
  api.start();

  const shutdown = () => {
    managers.forEach((manager) => manager.stopAll());
    api.stop();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  console.log(`AFK worker API ${baseConfig.webHost}:${baseConfig.webPort} üzerinde çalışıyor.`);
}

main();
