const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { normalizeRoll, isValidRollFormat } = require('../utils/roll');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function cookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 2 * 60 * 60 * 1000,
  };
}

router.post('/login', async (req, res, next) => {
  try {
    const rollNo = normalizeRoll(req.body && req.body.rollNo);
    if (!isValidRollFormat(rollNo)) {
      return res.status(400).json({ ok: false, error: 'Invalid roll number format. Example: 25280-cm-073' });
    }
    const doc = await db.collection('students').doc(rollNo).get();
    if (!doc.exists) {
      return res.status(404).json({ ok: false, error: 'Roll number not found in the student list.' });
    }
    const data = doc.data() || {};
    const token = jwt.sign({ rollNo }, process.env.SESSION_SECRET, { expiresIn: '2h' });
    res.cookie('session', token, cookieOptions());
    return res.json({ ok: true, name: data.name || '', hasVoted: !!data.hasVoted });
  } catch (err) {
    return next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('session', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  return res.json({ ok: true });
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const rollNo = req.user.rollNo;
    const doc = await db.collection('students').doc(rollNo).get();
    if (!doc.exists) {
      return res.status(401).json({ ok: false, error: 'Session invalid.' });
    }
    const data = doc.data() || {};
    return res.json({ ok: true, rollNo, name: data.name || '', hasVoted: !!data.hasVoted });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
