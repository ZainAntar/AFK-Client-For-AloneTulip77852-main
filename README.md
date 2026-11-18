# AFK Control

Mineflayer AFK client with local mode and a multi-user Firebase + Google authentication mode.

## Architecture

- `src/bot-manager.js`: Mineflayer lifecycle, status, reconnect and chat.
- `src/worker.js`: Starts local bots or watches per-user Firestore bot documents.
- `src/firestore-store.js`: Firebase Admin initialization and Firestore collection-group watcher.
- `src/worker-api.js`: Protected internal API for the Railway worker.
- `api/[...path].js`: Verifies Google/Firebase ID tokens, manages a user's Firestore configs and proxies the worker.
- `index.html`: Google sign-in panel, per-user config editor, status, logs and chat.

Passwords are stored in Firestore and are never returned by the panel API or logged.

## Local mode

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Set `BOT_NAMES` and optional `BOT_1_PASSWORD` values in `.env`. Do not set Firebase variables for local mode. Local mode does not require Google sign-in.

## Firebase setup

1. Create a Firebase project and enable **Authentication > Sign-in method > Google**.
2. Add the Vercel domain to **Authentication > Settings > Authorized domains**.
3. Create a Firestore database.
4. In **Project settings > Service accounts**, generate a service-account key.
5. In **Project settings > General**, copy the Web app configuration.
6. Create Firestore Security Rules so clients cannot directly access user data:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

The browser does not need Firestore access because all config operations go through the authenticated Vercel API. Public Firestore rules are not required.

## Railway worker

Set these variables in Railway:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete downloaded JSON as one environment value.
- `WORKER_API_TOKEN`: a long random secret.
- `WEB_HOST=0.0.0.0`
- `NODE_ENV=production`
- `PORT`: leave for Railway to assign automatically.

Start command:

```text
npm run start:worker
```

The worker watches `users/{uid}/bots` with Firebase Admin. It creates/recreates a Mineflayer manager for every configured user and starts bots configured with `autoStart: true`. Restarting Railway automatically reloads and restarts them. `BOT_NAMES` and `BOT_*_PASSWORD` are not required in Railway variables.

Create a Railway public domain and verify `/health`.

## Vercel deployment

Set these environment variables:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the same complete service-account JSON.
- `FIREBASE_WEB_CONFIG_JSON`: compact JSON containing `apiKey`, `authDomain`, `projectId`, and `appId`.
- `WORKER_URL`: the Railway public URL, for example `https://example.up.railway.app`.
- `WORKER_API_TOKEN`: exactly the Railway worker token.

Deploy this repository on Vercel. Firebase Admin verifies Google ID tokens in `api/[...path].js`; Vercel stores and updates only the signed-in user's documents.

After deployment, open the site, sign in with Google, enter the Minecraft host, bot name and password, then save. The worker receives the update through Firestore and starts/reconnects the bot.

## Security

- Never commit `.env` or service-account JSON.
- Keep `WORKER_API_TOKEN` and service-account credentials only in Railway/Vercel variables.
- Use HTTPS domains and keep the worker token secret.
- Ensure all bot use complies with the Minecraft server rules.
