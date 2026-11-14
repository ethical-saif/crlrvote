const jwt = require('jsonwebtoken');

function authRequired(req, res, next) {
  const token = req.cookies && req.cookies.session;
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Not logged in.' });
  }
  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Session expired. Please log in again.' });
  }
}

module.exports = { authRequired };
