const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MAX_ALLOWED_BOTS = 5;

function readPositiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} pozitif bir tam sayı olmalıdır.`);
  }
  return value;
}

function readBotNames() {
  const rawNames = (process.env.BOT_NAMES || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  if (rawNames.length === 0) {
    throw new Error('BOT_NAMES en az bir kullanıcı adı içermelidir.');
  }
  if (rawNames.length > MAX_ALLOWED_BOTS) {
    throw new Error(`En fazla ${MAX_ALLOWED_BOTS} bot desteklenir.`);
  }
  if (new Set(rawNames).size !== rawNames.length) {
    throw new Error('BOT_NAMES içinde tekrarlanan kullanıcı adları olamaz.');
  }
  return rawNames;
}

function readBotPasswords(botNames) {
  return botNames.map((_, index) => {
    const password = process.env[`BOT_${index + 1}_PASSWORD`];
    return password === undefined ? '' : password.trim();
  });
}

function readAfterLoginCommands() {
  return (process.env.AFTER_LOGIN_COMMANDS || '/boxmining,/warp afk')
    .split(',')
    .map((command) => command.trim())
    .filter(Boolean)
    .map((command) => command.startsWith('/') ? command : `/${command}`);
}

function loadConfig() {
  const port = readPositiveInteger('MC_PORT', 25565);
  const maxBots = readPositiveInteger('MAX_BOTS', MAX_ALLOWED_BOTS);
  if (maxBots > MAX_ALLOWED_BOTS) {
    throw new Error(`MAX_BOTS en fazla ${MAX_ALLOWED_BOTS} olabilir.`);
  }

  const botNames = readBotNames();
  if (botNames.length > maxBots) {
    throw new Error('BOT_NAMES sayısı MAX_BOTS değerinden fazla olamaz.');
  }
  const loginCommand = (process.env.LOGIN_COMMAND || '/login').trim();
  if (!loginCommand.startsWith('/')) {
    throw new Error('LOGIN_COMMAND / ile başlamalıdır.');
  }

  return {
    host: process.env.MC_HOST || 'localhost',
    port,
    version: process.env.MC_VERSION || '1.20.1',
    botNames,
    botPasswords: readBotPasswords(botNames),
    loginCommand,
    loginDelayMs: readPositiveInteger('LOGIN_DELAY_MS', 1500),
    afterLoginCommands: readAfterLoginCommands(),
    commandDelayMs: readPositiveInteger('COMMAND_DELAY_MS', 2000),
    reconnectBaseDelayMs: readPositiveInteger('RECONNECT_BASE_DELAY_MS', 5000),
    reconnectMaxDelayMs: readPositiveInteger('RECONNECT_MAX_DELAY_MS', 60000)
  };
}

module.exports = { loadConfig };
