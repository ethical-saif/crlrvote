require('dotenv').config();

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "blob:"],
      "font-src": ["'self'", "data:"],
      "connect-src": ["'self'"],
    },
  },
}));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many login attempts. Please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please try again later.' },
});

app.use('/api/login', loginLimiter);
app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/candidates'));
app.use('/api', require('./routes/vote'));
app.use('/api', require('./routes/admin'));

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: 'Not found.' });
});

const distPath = path.join(__dirname, 'client', 'dist');
const blockedFiles = new Set(['/privatekey.json', '/.env', '/README.md', '/server.js', '/package.json', '/package-lock.json', '/.gitignore', '/DEPLOY.md']);
app.use((req, res, next) => {
  if (blockedFiles.has(req.path)) return res.status(404).send('Not found');
  return next();
});
app.use(express.static(distPath));

app.get(/^(?!\/api).*/, (req, res) => {
  if (blockedFiles.has(req.path)) return res.status(404).send('Not found');
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.status || 500;
  res.status(status).json({ ok: false, error: 'Internal server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
