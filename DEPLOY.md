# Deployment on Render

## Option A: Blueprint (recommended)

1. Push the project to GitHub (without `privatekey.json`, `.env`, `README.md`).
2. Render → **New** → **Blueprint** → select the repo.
3. Render detects `render.yaml` and asks for the 3 secret values:
   - `SESSION_SECRET` (a long random string)
   - `ADMIN_KEY`
   - `FIREBASE_SERVICE_ACCOUNT` (paste the entire content of `privatekey.json`)
4. Click **Apply**. Render provisions the service with the configured build/start commands and health check.
5. Note: the free plan sleeps after 15 minutes idle; the first request can take 30 to 50 seconds. Open the site once before voting starts.

## Option B: Manual Web Service

1. Push the project to GitHub (without `privatekey.json`, `.env`, `README.md`).
2. Render → New → **Web Service** → connect the repo.
3. Build command: `npm install && npm run build`  |  Start command: `npm start`
4. Environment variables on Render: `NODE_ENV=production`, `NODE_VERSION=22`, `SESSION_SECRET`, `ADMIN_KEY`, and `FIREBASE_SERVICE_ACCOUNT` (paste the entire content of `privatekey.json`).
5. Note: the free plan sleeps after 15 minutes idle; the first request can take 30 to 50 seconds. Open the site once before voting starts.
