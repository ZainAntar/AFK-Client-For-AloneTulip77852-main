const mineflayer = require('mineflayer');
const { EventEmitter } = require('node:events');

const STATUS = Object.freeze({
  STOPPED: 'Durduruldu',
  STARTING: 'Bağlanıyor',
  ONLINE: 'Bağlı',
  RECONNECTING: 'Yeniden bağlanıyor'
});

class ManagedBot extends EventEmitter {
  constructor(name, connection, index) {
    super();
    this.name = name;
    this.connection = connection;
    this.index = index;
    this.status = STATUS.STOPPED;
    this.startedAt = null;
    this.connectedAt = null;
    this.lastError = '';
    this.reconnectAttempt = 0;
    this.reconnectTimer = null;
    this.loginTimer = null;
    this.actionTimer = null;
    this.actionIndex = 0;
    this.intentionalStop = false;
  }

  snapshot() {
    return {
      name: this.name,
      index: this.index,
      status: this.status,
      connectedAt: this.connectedAt,
      startedAt: this.startedAt,
      lastError: this.lastError
    };
  }

  inventorySnapshot() {
    if (!this.connection || !this.connection.inventory) return null;

    return this.connection.inventory.slots.map((item, slot) => {
      if (!item) return null;
      return {
        slot,
        name: item.name,
        displayName: item.displayName || item.name,
        count: item.count
      };
    });
  }

  setStatus(status) {
    this.status = status;
    this.emit('change', this.snapshot());
  }

  start() {
    if (this.status === STATUS.STARTING || this.status === STATUS.ONLINE) return;
    this.intentionalStop = false;
    this.lastError = '';
    this.startedAt = Date.now();
    this.setStatus(STATUS.STARTING);
    this.createClient();
  }

  stop() {
    this.intentionalStop = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.loginTimer) {
      clearTimeout(this.loginTimer);
      this.loginTimer = null;
    }
    if (this.actionTimer) {
      clearTimeout(this.actionTimer);
      this.actionTimer = null;
    }
    if (this.connection) this.connection.quit('Kontrol panelinden durduruldu');
    this.connectedAt = null;
    this.setStatus(STATUS.STOPPED);
  }

  createClient() {
    this.connection = mineflayer.createBot({
      host: this.connectionOptions.host,
      port: this.connectionOptions.port,
      username: this.name,
      version: this.connectionOptions.version,
      auth: 'offline',
      hideErrors: true
    });

    this.connection.once('login', () => {
      this.connectedAt = Date.now();
      this.reconnectAttempt = 0;
      this.setStatus(STATUS.ONLINE);
      this.scheduleLogin();
    });

    this.connection.on('error', (error) => {
      this.lastError = error.message || String(error);
      this.emit('change', this.snapshot());
      this.emit('error', { bot: this.snapshot(), error });
    });

    this.connection.on('messagestr', (message) => {
      this.emit('chat', message);
    });

    this.connection.on('end', (reason) => {
      this.connectedAt = null;
      if (this.loginTimer) {
        clearTimeout(this.loginTimer);
        this.loginTimer = null;
      }
      if (this.actionTimer) {
        clearTimeout(this.actionTimer);
        this.actionTimer = null;
      }
      if (!this.intentionalStop) {
        this.scheduleReconnect(reason || 'Bağlantı sonlandı');
      } else {
        this.setStatus(STATUS.STOPPED);
      }
    });
  }

  scheduleLogin() {
    const password = this.connectionOptions.botPasswords[this.index - 1];
    this.loginTimer = setTimeout(() => {
      this.loginTimer = null;
      if (this.intentionalStop || this.status !== STATUS.ONLINE) return;
      if (password) {
        this.connection.chat(`${this.connectionOptions.loginCommand} ${password}`);
      }
      this.actionIndex = 0;
      this.scheduleNextAction();
    }, this.connectionOptions.loginDelayMs);
  }

  scheduleNextAction() {
    const commands = this.connectionOptions.afterLoginCommands;
    if (this.intentionalStop || this.status !== STATUS.ONLINE || this.actionIndex >= commands.length) return;

    this.actionTimer = setTimeout(() => {
      this.actionTimer = null;
      if (this.intentionalStop || this.status !== STATUS.ONLINE) return;
      this.connection.chat(commands[this.actionIndex]);
      this.actionIndex += 1;
      this.scheduleNextAction();
    }, this.connectionOptions.commandDelayMs);
  }

  scheduleReconnect(reason) {
    if (this.reconnectTimer || this.intentionalStop) return;
    this.reconnectAttempt += 1;
    const delay = Math.min(
      this.connectionOptions.reconnectBaseDelayMs * (2 ** (this.reconnectAttempt - 1)),
      this.connectionOptions.reconnectMaxDelayMs
    );
    this.lastError = reason;
    this.setStatus(STATUS.RECONNECTING);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.intentionalStop) this.start();
    }, delay);
  }
}

class BotManager extends EventEmitter {
  constructor(config) {
    super();
    this.logs = [];
    this.maxLogs = 250;
    this.bots = config.botNames.map((name, index) => {
      const bot = new ManagedBot(name, null, index + 1);
      bot.connectionOptions = {
        ...config,
        ...(Array.isArray(config.botConfigs) ? config.botConfigs[index] : {})
      };
      bot.on('change', (snapshot) => {
        this.addLog(snapshot.index, 'status', snapshot.status);
        this.emit('change');
      });
      bot.on('error', (event) => {
        this.addLog(bot.index, 'error', event.error.message || String(event.error));
        this.emit('botError', event);
      });
      bot.on('chat', (message) => this.addLog(bot.index, 'chat', message));
      return bot;
    });
  }

  get snapshots() {
    return this.bots.map((bot) => bot.snapshot());
  }

  get activeCount() {
    return this.bots.filter((bot) => bot.status === STATUS.ONLINE).length;
  }

  start(index) {
    const bot = this.bots[index];
    if (bot) bot.start();
  }

  stop(index) {
    const bot = this.bots[index];
    if (bot) bot.stop();
  }

  startAll() {
    this.bots.forEach((bot) => bot.start());
  }

  stopAll() {
    this.bots.forEach((bot) => bot.stop());
  }

  addLog(botIndex, type, message) {
    const bot = this.bots[botIndex - 1];
    this.logs.push({
      timestamp: Date.now(),
      botIndex,
      botName: bot ? bot.name : `Bot ${botIndex}`,
      type,
      message: String(message).slice(0, 500)
    });
    if (this.logs.length > this.maxLogs) this.logs.splice(0, this.logs.length - this.maxLogs);
    this.emit('log');
  }

  getLogs(limit = 100) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), this.maxLogs);
    return this.logs.slice(-safeLimit);
  }

  sendChat(index, message) {
    const bot = this.bots[index];
    if (!bot || bot.status !== STATUS.ONLINE) return false;
    bot.connection.chat(message);
    this.addLog(bot.index, 'outgoing', message);
    return true;
  }

  inventory(index) {
    const bot = this.bots[index];
    if (!bot) return null;
    return {
      name: bot.name,
      index: bot.index,
      connected: bot.status === STATUS.ONLINE,
      slots: bot.inventorySnapshot()
    };
  }
}

module.exports = { BotManager, STATUS };
