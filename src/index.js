const { loadConfig } = require('./config');
const { BotManager } = require('./bot-manager');
const { TerminalUI } = require('./terminal-ui');

function main() {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error(`Yapılandırma hatası: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const manager = new BotManager(config);
  const ui = new TerminalUI(manager, config);
  ui.start();

  const shutdown = () => {
    manager.stopAll();
    ui.stop();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main();
