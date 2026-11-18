const { execFile } = require('node:child_process');
const { loadConfig } = require('./config');
const { BotManager } = require('./bot-manager');
const { WebUI } = require('./web-ui');

function openBrowser(url) {
  if (process.platform === 'win32') {
    execFile('cmd.exe', ['/c', 'start', '', url]);
  } else if (process.platform === 'darwin') {
    execFile('open', [url]);
  } else {
    execFile('xdg-open', [url]);
  }
}

function main() {
  const config = loadConfig();
  const manager = new BotManager(config);
  const ui = new WebUI(manager, config);
  const url = ui.start();
  console.log(`AFK Control arayuzu acildi: ${url}`);
  openBrowser(url);

  const shutdown = () => {
    manager.stopAll();
    ui.stop();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main();
