# Deployment on Render

1. Push the project to GitHub (without `privatekey.json`, `.env`, `README.md`).
2. Render → New → **Web Service** → connect the repo.
3. Build command: `npm install && npm run build`  |  Start command: `npm start`
4. Environment variables on Render: `NODE_ENV=production`, `SESSION_SECRET`, `ADMIN_KEY`, and `FIREBASE_SERVICE_ACCOUNT` (paste the entire content of `privatekey.json`).
5. Note: the free plan sleeps after 15 minutes idle; the first request can take 30 to 50 seconds. Open the site once before voting starts.
