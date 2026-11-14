const express = require('express');
const { FieldValue } = require('firebase-admin/firestore');
const { db } = require('../config/firebase');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/vote', authRequired, async (req, res, next) => {
  try {
    const rollNo = req.user.rollNo;
    let { crCandidateId, lrCandidateId } = req.body || {};
    crCandidateId = crCandidateId ? String(crCandidateId).trim().toLowerCase() : null;
    lrCandidateId = lrCandidateId ? String(lrCandidateId).trim().toLowerCase() : null;

    await db.runTransaction(async (tx) => {
      const voteRef = db.collection('votes').doc(rollNo);
      const studentRef = db.collection('students').doc(rollNo);

      const [voteSnap, studentSnap, crSnapAll, lrSnapAll] = await Promise.all([
        tx.get(voteRef),
        tx.get(studentRef),
        tx.get(db.collection('candidates').where('position', '==', 'CR')),
        tx.get(db.collection('candidates').where('position', '==', 'LR')),
      ]);

      if (voteSnap.exists) {
        const err = new Error('ALREADY_VOTED');
        err.code = 'ALREADY_VOTED';
        throw err;
      }
      if (!studentSnap.exists) {
        const err = new Error('STUDENT_NOT_FOUND');
        err.code = 'STUDENT_NOT_FOUND';
        throw err;
      }

      const crCandidates = [];
      crSnapAll.forEach((d) => crCandidates.push(d.id));
      const lrCandidates = [];
      lrSnapAll.forEach((d) => lrCandidates.push(d.id));

      if (crCandidates.length > 0 && !crCandidateId) {
        const err = new Error('CR_REQUIRED');
        err.code = 'CR_REQUIRED';
        throw err;
      }
      if (lrCandidates.length > 0 && !lrCandidateId) {
        const err = new Error('LR_REQUIRED');
        err.code = 'LR_REQUIRED';
        throw err;
      }
      if (!crCandidateId && !lrCandidateId) {
        const err = new Error('NO_SELECTION');
        err.code = 'NO_SELECTION';
        throw err;
      }

      let crRef = null;
      let lrRef = null;
      if (crCandidateId) {
        crRef = db.collection('candidates').doc(crCandidateId);
      }
      if (lrCandidateId) {
        lrRef = db.collection('candidates').doc(lrCandidateId);
      }

      if (crRef) {
        const crDoc = await tx.get(crRef);
        if (!crDoc.exists || (crDoc.data() || {}).position !== 'CR') {
          const err = new Error('INVALID_CR');
          err.code = 'INVALID_CR';
          throw err;
        }
      }
      if (lrRef) {
        const lrDoc = await tx.get(lrRef);
        if (!lrDoc.exists || (lrDoc.data() || {}).position !== 'LR') {
          const err = new Error('INVALID_LR');
          err.code = 'INVALID_LR';
          throw err;
        }
      }

      tx.set(voteRef, {
        rollNo,
        crCandidateId: crCandidateId || null,
        lrCandidateId: lrCandidateId || null,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(studentRef, { hasVoted: true });
      if (crRef) {
        tx.update(crRef, { voteCount: FieldValue.increment(1) });
      }
      if (lrRef) {
        tx.update(lrRef, { voteCount: FieldValue.increment(1) });
      }
    });

    return res.json({ ok: true });
  } catch (err) {
    if (err && err.code === 'ALREADY_VOTED') {
      return res.status(409).json({ ok: false, error: 'You have already voted.' });
    }
    if (err && err.code === 'CR_REQUIRED') {
      return res.status(400).json({ ok: false, error: 'Please select a CR candidate.' });
    }
    if (err && err.code === 'LR_REQUIRED') {
      return res.status(400).json({ ok: false, error: 'Please select an LR candidate.' });
    }
    if (err && err.code === 'NO_SELECTION') {
      return res.status(400).json({ ok: false, error: 'At least one selection is required.' });
    }
    if (err && err.code === 'INVALID_CR') {
      return res.status(400).json({ ok: false, error: 'Selected CR candidate is invalid.' });
    }
    if (err && err.code === 'INVALID_LR') {
      return res.status(400).json({ ok: false, error: 'Selected LR candidate is invalid.' });
    }
    if (err && err.code === 'STUDENT_NOT_FOUND') {
      return res.status(404).json({ ok: false, error: 'Student record not found.' });
    }
    return next(err);
  }
});

module.exports = router;
