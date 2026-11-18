const readline = require('node:readline');
const { STATUS } = require('./bot-manager');

function formatDuration(timestamp) {
  if (!timestamp) return '-';
  const totalSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

class TerminalUI {
  constructor(manager, config) {
    this.manager = manager;
    this.config = config;
    this.refreshTimer = null;
    this.rl = null;
    this.closed = false;
    this.onManagerChange = () => this.render();
  }

  start() {
    this.manager.on('change', this.onManagerChange);
    this.manager.on('botError', ({ bot, error }) => {
      process.stderr.write(`[Bot ${bot.index}] ${error.message || error}\n`);
    });

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'Komut (h=yardım): '
    });
    this.rl.on('line', (line) => this.handleCommand(line.trim().toLowerCase()));
    this.rl.on('close', () => {
      this.closed = true;
      this.manager.stopAll();
      process.exit(0);
    });

    this.render();
    this.refreshTimer = setInterval(() => this.render(), 1000);
  }

  stop() {
    this.closed = true;
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.rl) this.rl.close();
  }

  render() {
    if (this.closed || !this.rl) return;
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    console.log(`Mineflayer AFK Panel | ${this.config.host}:${this.config.port} | MC ${this.config.version}`);
    console.log('='.repeat(88));
    console.log('Bot   Kullanıcı adı       Durum             Bağlanma süresi   Son hata');
    console.log('-'.repeat(88));
    this.manager.snapshots.forEach((bot) => {
      const error = (bot.lastError || '-').slice(0, 32);
      console.log(
        `${String(bot.index).padEnd(6)}${bot.name.padEnd(21)}${bot.status.padEnd(19)}${formatDuration(bot.connectedAt).padEnd(19)}${error}`
      );
    });
    console.log('-'.repeat(88));
    console.log(`Aktif bot: ${this.manager.activeCount}/${this.manager.snapshots.length}`);
    console.log('Komutlar: b1-b5 başlat | d1-d5 durdur | ba hepsini başlat | da hepsini durdur | h yardım | q çıkış');
    this.rl.prompt(true);
  }

  handleCommand(command) {
    if (command === 'q' || command === 'quit' || command === 'exit') {
      this.stop();
      return;
    }
    if (command === 'ba') this.manager.startAll();
    else if (command === 'da') this.manager.stopAll();
    else if (/^[bd][1-5]$/.test(command)) {
      const index = Number(command[1]) - 1;
      if (command[0] === 'b') this.manager.start(index);
      else this.manager.stop(index);
    } else if (command === 'h') {
      console.log('\nÖrnek: b1 ile Bot 1 başlar, d1 ile durur. ba/da tüm botları yönetir.\n');
    } else {
      console.log('\nBilinmeyen komut. h yazarak yardım alın.\n');
    }
    this.render();
  }
}

module.exports = { TerminalUI };
