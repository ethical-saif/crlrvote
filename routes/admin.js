const express = require('express');
const { db } = require('../config/firebase');
const { normalizeRoll, isValidRollFormat } = require('../utils/roll');

const router = express.Router();

function isAdmin(req) {
  const key = req.header('x-admin-key');
  return !!process.env.ADMIN_KEY && key === process.env.ADMIN_KEY;
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({ ok: false, error: 'Unauthorized.' });
  }
  return next();
}

function effectiveStatus(d) {
  const s = d && d.status;
  if (s === 'pending' || s === 'approved' || s === 'rejected') return s;
  return 'approved';
}

function toIso(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  return null;
}

router.get('/admin/results', requireAdmin, async (req, res, next) => {
  try {
    const [candSnap, studentsSnap, votesSnap] = await Promise.all([
      db.collection('candidates').get(),
      db.collection('students').get(),
      db.collection('votes').get(),
    ]);

    const candidates = [];
    candSnap.forEach((doc) => {
      const d = doc.data() || {};
      if (effectiveStatus(d) !== 'approved') return;
      candidates.push({
        id: doc.id,
        rollNo: d.rollNo || doc.id,
        name: d.name || '',
        position: d.position,
        manifesto: d.manifesto || '',
        voteCount: typeof d.voteCount === 'number' ? d.voteCount : 0,
        hasPhoto: !!d.hasPhoto,
      });
    });

    candidates.sort((a, b) => {
      if (a.position !== b.position) return a.position.localeCompare(b.position);
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.name.localeCompare(b.name);
    });

    return res.json({
      ok: true,
      candidates,
      totalVotes: votesSnap.size,
      totalStudents: studentsSnap.size,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/admin/candidates', requireAdmin, async (req, res, next) => {
  try {
    const snap = await db.collection('candidates').get();
    const candidates = [];
    snap.forEach((doc) => {
      const d = doc.data() || {};
      candidates.push({
        rollNo: d.rollNo || doc.id,
        name: d.name || '',
        position: d.position || '',
        manifesto: d.manifesto || '',
        status: effectiveStatus(d),
        voteCount: typeof d.voteCount === 'number' ? d.voteCount : 0,
        hasPhoto: !!d.hasPhoto,
        createdAt: toIso(d.createdAt),
      });
    });
    candidates.sort((a, b) => {
      if (a.status !== b.status) return a.status.localeCompare(b.status);
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });
    return res.json({ ok: true, candidates });
  } catch (err) {
    return next(err);
  }
});

router.post('/admin/candidates/:rollNo/approve', requireAdmin, async (req, res, next) => {
  try {
    const rollNo = normalizeRoll(req.params.rollNo || '');
    if (!isValidRollFormat(rollNo)) {
      return res.status(400).json({ ok: false, error: 'Invalid roll number format.' });
    }
    const ref = db.collection('candidates').doc(rollNo);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ ok: false, error: 'Candidate not found.' });
    }
    const st = effectiveStatus(doc.data() || {});
    if (st !== 'pending' && st !== 'rejected') {
      return res.status(400).json({ ok: false, error: 'Only pending or rejected candidates can be approved.' });
    }
    await ref.update({ status: 'approved' });
    return res.json({ ok: true, message: 'Candidate approved.' });
  } catch (err) {
    return next(err);
  }
});

router.post('/admin/candidates/:rollNo/reject', requireAdmin, async (req, res, next) => {
  try {
    const rollNo = normalizeRoll(req.params.rollNo || '');
    if (!isValidRollFormat(rollNo)) {
      return res.status(400).json({ ok: false, error: 'Invalid roll number format.' });
    }
    const ref = db.collection('candidates').doc(rollNo);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ ok: false, error: 'Candidate not found.' });
    }
    const st = effectiveStatus(doc.data() || {});
    if (st !== 'pending') {
      return res.status(400).json({ ok: false, error: 'Only pending candidates can be rejected.' });
    }
    await ref.update({ status: 'rejected' });
    return res.json({ ok: true, message: 'Candidate rejected.' });
  } catch (err) {
    return next(err);
  }
});

router.delete('/admin/candidates/:rollNo', requireAdmin, async (req, res, next) => {
  try {
    const rollNo = normalizeRoll(req.params.rollNo || '');
    if (!isValidRollFormat(rollNo)) {
      return res.status(400).json({ ok: false, error: 'Invalid roll number format.' });
    }
    const candRef = db.collection('candidates').doc(rollNo);
    const candDoc = await candRef.get();
    if (!candDoc.exists) {
      return res.status(404).json({ ok: false, error: 'Candidate not found.' });
    }

    const [crVotes, lrVotes] = await Promise.all([
      db.collection('votes').where('crCandidateId', '==', rollNo).get(),
      db.collection('votes').where('lrCandidateId', '==', rollNo).get(),
    ]);

    const updates = [];
    crVotes.forEach((doc) => updates.push({ ref: doc.ref, field: 'crCandidateId' }));
    lrVotes.forEach((doc) => updates.push({ ref: doc.ref, field: 'lrCandidateId' }));

    let votesRemoved = 0;
    const batchSize = 400;
    for (let i = 0; i < updates.length; i += batchSize) {
      const chunk = updates.slice(i, i + batchSize);
      const batch = db.batch();
      chunk.forEach((u) => {
        batch.update(u.ref, { [u.field]: null });
        votesRemoved += 1;
      });
      await batch.commit();
    }

    const deleteBatch = db.batch();
    deleteBatch.delete(candRef);
    deleteBatch.delete(db.collection('candidatePhotos').doc(rollNo));
    await deleteBatch.commit();

    return res.json({ ok: true, message: 'Candidate deleted.', votesRemoved });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
