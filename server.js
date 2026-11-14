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
    },
  },
}));
app.use(express.json({ limit: '10kb' }));
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

app.use(express.static(path.join(__dirname, 'public')));

app.get('/candidates', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'candidates.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use('/api', (req, res) => {
  res.status(404).json({ ok: false, error: 'Not found.' });
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
