const http = require('node:http');
const { URL } = require('node:url');

const PAGE = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AFK Control / Mineflayer</title>
  <style>
    :root {
      --paper: #e8e2d4;
      --paper-deep: #d7cebc;
      --ink: #20211d;
      --faded: #6e6c63;
      --rule: rgba(32, 33, 29, .22);
      --red: #b63a2b;
      --blue: #224b67;
      --green: #356247;
      --yellow: #e7bd53;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; color: var(--ink);
      background-color: var(--paper);
      background-image:
        linear-gradient(90deg, rgba(32,33,29,.035) 1px, transparent 1px),
        linear-gradient(rgba(32,33,29,.035) 1px, transparent 1px);
      background-size: 24px 24px;
      font-family: Georgia, "Times New Roman", serif;
    }
    body::before {
      content: ""; display: block; position: fixed; inset: 0; pointer-events: none; opacity: .18;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.16'/%3E%3C/svg%3E");
      mix-blend-mode: multiply;
    }
    .shell { max-width: 1240px; margin: auto; padding: 54px 34px 42px; }
    header { display: flex; justify-content: space-between; gap: 36px; align-items: end; padding-bottom: 25px; border-bottom: 3px solid var(--ink); }
    .eyebrow { color: var(--red); font: 700 11px/1 "Courier New", monospace; letter-spacing: .24em; text-transform: uppercase; }
    h1 { margin: 13px 0 0; font: 700 clamp(48px, 8vw, 102px)/.78 Georgia, serif; letter-spacing: -.075em; }
    .intro { max-width: 350px; margin: 0 0 2px; color: var(--faded); font: italic 16px/1.42 Georgia, serif; text-align: right; }
    .overview { display: grid; grid-template-columns: 1.35fr repeat(3, 1fr); gap: 0; margin: 25px 0 31px; border-top: 1px solid var(--ink); border-bottom: 1px solid var(--ink); }
    .metric { min-height: 100px; padding: 16px 18px 13px; border-right: 1px solid var(--rule); }
    .metric:last-child { border-right: 0; }
    .metric:first-child { background: var(--yellow); }
    .metric-label { color: var(--faded); font: 700 10px "Courier New", monospace; letter-spacing: .12em; text-transform: uppercase; }
    .metric-value { margin-top: 15px; font: 700 24px Georgia, serif; overflow-wrap: anywhere; }
    .metric:first-child .metric-label, .metric:first-child .metric-value { color: var(--ink); }
    .actions { display: flex; align-items: center; justify-content: space-between; margin: 0 0 13px; }
    .actions h2 { margin: 0; font: 700 29px Georgia, serif; letter-spacing: -.04em; }
    button {
      border: 1px solid var(--ink); color: var(--ink); background: transparent; padding: 11px 15px;
      font: 700 10px "Courier New", monospace; letter-spacing: .09em; text-transform: uppercase; cursor: pointer;
      box-shadow: 3px 3px 0 var(--ink); transition: transform .14s, box-shadow .14s, background .14s;
    }
    button:hover { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--ink); background: rgba(32,33,29,.08); }
    button.primary { color: var(--paper); border-color: var(--blue); background: var(--blue); box-shadow: 3px 3px 0 var(--ink); }
    button.danger:hover { color: var(--paper); border-color: var(--red); background: var(--red); }
    .button-row { display: flex; gap: 11px; }
    .bot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 17px; }
    .bot-card {
      position: relative; overflow: hidden; min-height: 280px; padding: 19px;
      background: rgba(248, 244, 234, .64); border: 1px solid var(--ink);
      box-shadow: 6px 6px 0 rgba(32,33,29,.16); transition: transform .18s, box-shadow .18s;
    }
    .bot-card:nth-child(3n + 2) { transform: translateY(9px); }
    .bot-card:nth-child(3n + 2):hover { transform: translateY(5px); }
    .bot-card:hover { box-shadow: 9px 9px 0 rgba(32,33,29,.18); }
    .bot-card::before { content: ""; position: absolute; inset: 0 0 auto; height: 8px; background: var(--faded); }
    .bot-card.online::before { background: var(--green); }
    .bot-card.starting::before, .bot-card.reconnecting::before { background: var(--yellow); }
    .bot-top { display: flex; justify-content: space-between; align-items: start; padding-top: 7px; }
    .bot-index { color: var(--red); font: 700 11px "Courier New", monospace; }
    .bot-name { margin: 9px 0 22px; font: 700 27px/.95 Georgia, serif; overflow-wrap: anywhere; }
    .status { display: inline-flex; gap: 7px; align-items: center; color: var(--faded); font: 700 11px "Courier New", monospace; }
    .status::before { content: ""; width: 8px; height: 8px; border: 1px solid currentColor; background: currentColor; }
    .online .status { color: var(--green); }
    .starting .status, .reconnecting .status { color: #a67d16; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; border-top: 1px solid var(--rule); margin-top: 20px; padding-top: 14px; }
    .detail-label { color: var(--faded); font: 700 9px "Courier New", monospace; text-transform: uppercase; }
    .detail-value { margin-top: 6px; font: 14px Georgia, serif; overflow-wrap: anywhere; }
    .error { min-height: 34px; margin-top: 13px; color: var(--red); font: 10px/1.35 "Courier New", monospace; }
    .card-actions { display: flex; gap: 8px; margin-top: 3px; }
    .card-actions button { flex: 1; padding: 8px; box-shadow: 2px 2px 0 var(--ink); }
    .foot { display: flex; justify-content: space-between; color: var(--faded); margin-top: 47px; font: 10px "Courier New", monospace; letter-spacing: .08em; }
    .inventory-modal[hidden] { display: none; }
    .inventory-modal { position: fixed; inset: 0; z-index: 3; display: grid; place-items: center; padding: 20px; background: rgba(32,33,29,.58); }
    .inventory-window { width: min(570px, 100%); padding: 22px; background: var(--paper); border: 2px solid var(--ink); box-shadow: 10px 10px 0 rgba(32,33,29,.35); }
    .inventory-heading { display: flex; align-items: start; justify-content: space-between; gap: 16px; border-bottom: 2px solid var(--ink); padding-bottom: 15px; }
    .inventory-heading h2 { margin: 0; font: 700 28px Georgia, serif; }
    .inventory-heading p { margin: 5px 0 0; color: var(--faded); font: 11px "Courier New", monospace; }
    .inventory-close { padding: 7px 10px; box-shadow: none; }
    .inventory-grid { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; margin-top: 20px; padding: 7px; background: var(--paper-deep); border: 1px solid var(--ink); }
    .inventory-slot { position: relative; aspect-ratio: 1; display: grid; place-items: center; overflow: hidden; background: #aaa9a1; border: 2px solid #464640; border-top-color: #f3efe3; border-left-color: #f3efe3; color: var(--ink); text-align: center; }
    .inventory-slot:nth-child(n+28) { margin-top: 9px; }
    .inventory-slot.filled { background: #c7b98d; }
    .item-label { max-width: 90%; font: 700 clamp(7px, 1.5vw, 11px)/1 "Courier New", monospace; overflow-wrap: anywhere; }
    .item-count { position: absolute; right: 3px; bottom: 1px; color: var(--ink); font: 700 12px "Courier New", monospace; }
    .inventory-note { margin: 13px 0 0; color: var(--faded); font: 10px/1.4 "Courier New", monospace; }
    @media (max-width: 780px) {
      .shell { padding: 30px 16px 38px; } header { display: block; } .intro { margin-top: 23px; text-align: left; }
      .overview { grid-template-columns: 1fr 1fr; } .metric:first-child { grid-column: span 2; }
      .metric:nth-child(2) { border-bottom: 1px solid var(--rule); } .metric:nth-child(3) { border-right: 0; border-bottom: 1px solid var(--rule); }
      .actions { display: block; } .button-row { margin-top: 16px; }
      .bot-card:nth-child(3n + 2) { transform: none; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header>
      <div><div class="eyebrow">Local control / 01</div><h1>AFK<br>Control.</h1></div>
      <p class="intro">Mineflayer bağlantılarını sessizce izleyin. Her bot için giriş, rota ve yeniden bağlanma akışı ayrı yönetilir.</p>
    </header>
    <section class="overview">
      <div class="metric"><div class="metric-label">Aktif botlar</div><div class="metric-value" id="active">0 / 0</div></div>
      <div class="metric"><div class="metric-label">Sunucu</div><div class="metric-value" id="server">—</div></div>
      <div class="metric"><div class="metric-label">Protokol</div><div class="metric-value" id="version">—</div></div>
      <div class="metric"><div class="metric-label">Son tarama</div><div class="metric-value" id="updated">—</div></div>
    </section>
    <div class="actions"><h2>Bot filosu</h2><div class="button-row"><button class="primary" data-action="start-all">Tümünü başlat</button><button class="danger" data-action="stop-all">Tümünü durdur</button></div></div>
    <section class="bot-grid" id="bots"></section>
    <div class="foot"><span>LOCALHOST / NO GAME CLIENT</span><span id="clock"></span></div>
  </main>
  <div class="inventory-modal" id="inventory-modal" hidden>
    <section class="inventory-window" role="dialog" aria-modal="true" aria-labelledby="inventory-title">
      <div class="inventory-heading">
        <div><h2 id="inventory-title">Envanter</h2><p id="inventory-subtitle">Bağlantı bekleniyor</p></div>
        <button class="inventory-close" data-action="close-inventory" aria-label="Envanteri kapat">Kapat</button>
      </div>
      <div class="inventory-grid" id="inventory-grid"></div>
      <p class="inventory-note">Salt okunur görünüm · slot verisi bot bağlantısından alınır</p>
    </section>
  </div>
  <script>
    const formatDuration = (timestamp) => {
      if (!timestamp) return "—";
      const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
      return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
        .map((value) => String(value).padStart(2, "0")).join(":");
    };
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
    async function action(path) {
      await fetch(path, { method: "POST" });
      await refresh();
    }
    function render(state) {
      document.querySelector("#active").textContent = state.activeCount + " / " + state.bots.length;
      document.querySelector("#server").textContent = state.host + ":" + state.port;
      document.querySelector("#version").textContent = state.version;
      document.querySelector("#updated").textContent = new Date().toLocaleTimeString("tr-TR");
      document.querySelector("#clock").textContent = new Date().toLocaleTimeString("tr-TR");
      document.querySelector("#bots").innerHTML = state.bots.map((bot) => {
        const className = bot.status.toLowerCase().replaceAll("ı", "i").replaceAll(" ", "");
        return '<article class="bot-card ' + className + '">' +
          '<div class="bot-top"><div><div class="bot-index">UNIT ' + String(bot.index).padStart(2, "0") + '</div>' +
          '<div class="bot-name">' + escapeHtml(bot.name) + '</div></div><div class="status">' + escapeHtml(bot.status) + '</div></div>' +
          '<div class="details"><div><div class="detail-label">Bağlanma süresi</div><div class="detail-value">' + formatDuration(bot.connectedAt) + '</div></div>' +
          '<div><div class="detail-label">Son hata</div><div class="detail-value">' + escapeHtml(bot.lastError || "Temiz") + '</div></div></div>' +
          '<div class="error"></div><div class="card-actions">' +
          '<button data-action="inventory" data-index="' + bot.index + '">Envanter</button>' +
          '<button data-action="start" data-index="' + bot.index + '">Başlat</button>' +
          '<button class="danger" data-action="stop" data-index="' + bot.index + '">Durdur</button></div></article>';
      }).join("");
    }
    async function showInventory(index) {
      const response = await fetch("/api/bots/" + index + "/inventory");
      const data = await response.json();
      document.querySelector("#inventory-modal").hidden = false;
      document.querySelector("#inventory-title").textContent = "Envanter / " + data.name;
      document.querySelector("#inventory-subtitle").textContent = data.connected ? "Bağlı · salt okunur" : "Bot bağlı değil";
      const slots = data.slots
        ? (data.slots.length >= 45 ? data.slots.slice(9, 45) : data.slots.slice(0, 36))
        : Array.from({ length: 36 }, () => null);
      document.querySelector("#inventory-grid").innerHTML = slots.slice(0, 36).map((item) => {
        if (!item) return '<div class="inventory-slot" aria-label="Boş slot"></div>';
        return '<div class="inventory-slot filled" title="' + escapeHtml(item.displayName) + '">' +
          '<span class="item-label">' + escapeHtml(item.displayName) + '</span>' +
          '<span class="item-count">' + item.count + '</span></div>';
      }).join("");
    }
    async function refresh() {
      const response = await fetch("/api/state");
      render(await response.json());
    }
    document.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;
      const actionName = button.dataset.action;
      if (actionName === "start-all") action("/api/all/start");
      else if (actionName === "stop-all") action("/api/all/stop");
      else if (actionName === "inventory") showInventory(button.dataset.index);
      else if (actionName === "close-inventory") document.querySelector("#inventory-modal").hidden = true;
      else if (actionName === "start") action("/api/bots/" + button.dataset.index + "/start");
      else if (actionName === "stop") action("/api/bots/" + button.dataset.index + "/stop");
    });
    document.querySelector("#inventory-modal").addEventListener("click", (event) => {
      if (event.target.id === "inventory-modal") event.currentTarget.hidden = true;
    });
    refresh();
    setInterval(refresh, 1000);
  </script>
</body>
</html>`;

class WebUI {
  constructor(manager, config) {
    this.manager = manager;
    this.config = config;
    this.server = null;
  }

  state() {
    return {
      host: this.config.host,
      port: this.config.port,
      version: this.config.version,
      activeCount: this.manager.activeCount,
      bots: this.manager.snapshots
    };
  }

  start(port = 3210) {
    this.server = http.createServer((request, response) => {
      const url = new URL(request.url, `http://${request.headers.host}`);
      if (request.method === 'GET' && url.pathname === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(PAGE);
        return;
      }
      if (request.method === 'GET' && url.pathname === '/api/state') {
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify(this.state()));
        return;
      }
      const match = url.pathname.match(/^\/api\/(bots\/(\d+)|(all))\/(start|stop)$/);
      if (request.method === 'POST' && match) {
        if (match[3] === 'all') {
          match[4] === 'start' ? this.manager.startAll() : this.manager.stopAll();
        } else {
          const index = Number(match[2]) - 1;
          match[4] === 'start' ? this.manager.start(index) : this.manager.stop(index);
        }
        response.writeHead(204);
        response.end();
        return;
      }
      const inventoryMatch = url.pathname.match(/^\/api\/bots\/(\d+)\/inventory$/);
      if (request.method === 'GET' && inventoryMatch) {
        const inventory = this.manager.inventory(Number(inventoryMatch[1]) - 1);
        if (!inventory) {
          response.writeHead(404);
          response.end('Bot not found');
          return;
        }
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify(inventory));
        return;
      }
      response.writeHead(404);
      response.end('Not found');
    });
    this.server.listen(port, '127.0.0.1');
    return `http://127.0.0.1:${port}`;
  }

  stop() {
    if (this.server) this.server.close();
  }
}

module.exports = { WebUI };
