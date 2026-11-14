const express = require('express');
const { FieldValue } = require('firebase-admin/firestore');
const { db } = require('../config/firebase');
const { normalizeRoll, isValidRollFormat } = require('../utils/roll');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

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
    let { rollNo, name, position, manifesto } = req.body || {};
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

    await db.collection('candidates').doc(rollNo).set({
      rollNo,
      name: finalName,
      position,
      manifesto,
      voteCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ ok: true, message: 'Registered successfully.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
