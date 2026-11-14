const express = require('express');
const { db } = require('../config/firebase');

const router = express.Router();

router.get('/admin/results', async (req, res, next) => {
  try {
    const key = req.header('x-admin-key');
    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ ok: false, error: 'Unauthorized.' });
    }

    const [candSnap, studentsSnap, votesSnap] = await Promise.all([
      db.collection('candidates').get(),
      db.collection('students').get(),
      db.collection('votes').get(),
    ]);

    const candidates = [];
    candSnap.forEach((doc) => {
      const d = doc.data() || {};
      candidates.push({
        id: doc.id,
        rollNo: d.rollNo || doc.id,
        name: d.name || '',
        position: d.position,
        manifesto: d.manifesto || '',
        voteCount: typeof d.voteCount === 'number' ? d.voteCount : 0,
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

module.exports = router;
