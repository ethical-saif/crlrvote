const express = require('express');
const { FieldValue } = require('firebase-admin/firestore');
const { db } = require('../config/firebase');
const { normalizeRoll, isValidRollFormat } = require('../utils/roll');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

const MAX_PHOTO_BYTES = 60 * 1024;
const ALLOWED_PHOTO = {
  'image/jpeg': { prefix: 'data:image/jpeg;base64,', sig: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { prefix: 'data:image/png;base64,', sig: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a },
  'image/webp': { prefix: 'data:image/webp;base64,', sig: (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
};

function parsePhoto(photo) {
  if (photo == null || photo === '') return null;
  if (typeof photo !== 'string') {
    return { error: 'Invalid photo format.' };
  }
  let match = null;
  for (const [contentType, cfg] of Object.entries(ALLOWED_PHOTO)) {
    if (photo.startsWith(cfg.prefix)) {
      match = { contentType, cfg, b64: photo.slice(cfg.prefix.length) };
      break;
    }
  }
  if (!match) {
    return { error: 'Photo must be a JPEG, PNG, or WebP image.' };
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(match.b64)) {
    return { error: 'Invalid photo data.' };
  }
  let buf;
  try {
    buf = Buffer.from(match.b64, 'base64');
  } catch (e) {
    return { error: 'Invalid photo data.' };
  }
  if (!buf || buf.length === 0) {
    return { error: 'Invalid photo data.' };
  }
  if (buf.length > MAX_PHOTO_BYTES) {
    return { error: 'Photo is too large. Please use a smaller image.' };
  }
  if (!match.cfg.sig(buf)) {
    return { error: 'Invalid or unsupported image file.' };
  }
  // reject SVG markers just in case
  const head = buf.slice(0, 256).toString('utf8').toLowerCase();
  if (head.includes('<svg') || head.includes('<?xml')) {
    return { error: 'SVG images are not allowed.' };
  }
  return { buffer: buf, contentType: match.contentType, data: photo };
}

router.get('/candidates', authRequired, async (req, res, next) => {
  try {
    const snap = await db.collection('candidates').get();
    const grouped = { CR: [], LR: [] };
    snap.forEach((doc) => {
      const d = doc.data() || {};
      const item = {
        id: doc.id,
        rollNo: d.rollNo || doc.id,
        name: d.name || '',
        position: d.position,
        manifesto: d.manifesto || '',
        hasPhoto: !!d.hasPhoto,
      };
      if (d.position === 'CR') grouped.CR.push(item);
      else if (d.position === 'LR') grouped.LR.push(item);
    });
    grouped.CR.sort((a, b) => a.name.localeCompare(b.name));
    grouped.LR.sort((a, b) => a.name.localeCompare(b.name));
    return res.json({ ok: true, candidates: grouped });
  } catch (err) {
    return next(err);
  }
});

router.post('/candidates/register', async (req, res, next) => {
  try {
    let { rollNo, name, position, manifesto, photo } = req.body || {};
    rollNo = normalizeRoll(rollNo);
    position = typeof position === 'string' ? position.trim().toUpperCase() : '';
    name = typeof name === 'string' ? name.trim() : '';
    manifesto = typeof manifesto === 'string' ? manifesto.trim() : '';

    if (!isValidRollFormat(rollNo)) {
      return res.status(400).json({ ok: false, error: 'Invalid roll number format. Example: 25280-cm-073' });
    }
    if (position !== 'CR' && position !== 'LR') {
      return res.status(400).json({ ok: false, error: 'Position must be CR or LR.' });
    }
    if (manifesto.length > 200) {
      return res.status(400).json({ ok: false, error: 'Manifesto must be 200 characters or less.' });
    }

    const parsedPhoto = parsePhoto(photo);
    if (parsedPhoto && parsedPhoto.error) {
      return res.status(400).json({ ok: false, error: parsedPhoto.error });
    }

    const studentDoc = await db.collection('students').doc(rollNo).get();
    if (!studentDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Roll number not found in the student list.' });
    }

    const existing = await db.collection('candidates').doc(rollNo).get();
    if (existing.exists) {
      return res.status(409).json({ ok: false, error: 'You are already registered as a candidate.' });
    }

    const studentData = studentDoc.data() || {};
    const finalName = name || studentData.name || '';

    const batch = db.batch();
    const candRef = db.collection('candidates').doc(rollNo);
    batch.set(candRef, {
      rollNo,
      name: finalName,
      position,
      manifesto,
      voteCount: 0,
      hasPhoto: !!parsedPhoto,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (parsedPhoto) {
      const photoRef = db.collection('candidatePhotos').doc(rollNo);
      batch.set(photoRef, {
        rollNo,
        data: parsedPhoto.data,
        contentType: parsedPhoto.contentType,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    return res.status(201).json({ ok: true, message: 'Registered successfully.', hasPhoto: !!parsedPhoto });
  } catch (err) {
    return next(err);
  }
});

router.get('/candidates/:rollNo/photo', async (req, res, next) => {
  try {
    const rollNo = normalizeRoll(req.params.rollNo || '');
    if (!isValidRollFormat(rollNo)) {
      return res.status(404).send('Not found');
    }
    const doc = await db.collection('candidatePhotos').doc(rollNo).get();
    if (!doc.exists) {
      return res.status(404).send('Not found');
    }
    const d = doc.data() || {};
    const data = d.data;
    const contentType = d.contentType;
    if (typeof data !== 'string' || typeof contentType !== 'string') {
      return res.status(404).send('Not found');
    }
    const prefix = `data:${contentType};base64,`;
    if (!data.startsWith(prefix)) {
      return res.status(404).send('Not found');
    }
    const buf = Buffer.from(data.slice(prefix.length), 'base64');
    if (!buf.length) {
      return res.status(404).send('Not found');
    }
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(buf);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
