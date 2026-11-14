const { db } = require('../config/firebase');

let cache = { data: null, expiresAt: 0 };
const TTL_MS = 10 * 1000;

function invalidateResultsCache() {
  cache = { data: null, expiresAt: 0 };
}

function effectiveStatus(d) {
  const s = d && d.status;
  if (s === 'pending' || s === 'approved' || s === 'rejected') return s;
  return 'approved';
}

async function getResultsVisible() {
  const doc = await db.collection('settings').doc('results').get();
  if (!doc.exists) return true;
  const d = doc.data() || {};
  if (typeof d.visible === 'boolean') return d.visible;
  return true;
}

async function getCount(collectionName) {
  const snap = await db.collection(collectionName).count().get();
  const data = snap.data() || {};
  return typeof data.count === 'number' ? data.count : 0;
}

async function computePublicResults() {
  const visible = await getResultsVisible();
  if (!visible) {
    return { visible: false };
  }

  const [votesCount, studentsCount, candSnap] = await Promise.all([
    getCount('votes'),
    getCount('students'),
    db.collection('candidates').get(),
  ]);

  const approved = [];
  candSnap.forEach((doc) => {
    const d = doc.data() || {};
    if (effectiveStatus(d) !== 'approved') return;
    if (d.position !== 'CR' && d.position !== 'LR') return;
    approved.push({
      rollNo: d.rollNo || doc.id,
      name: d.name || '',
      hasPhoto: !!d.hasPhoto,
      voteCount: typeof d.voteCount === 'number' ? d.voteCount : 0,
      position: d.position,
    });
  });

  function buildList(position) {
    const list = approved.filter((c) => c.position === position).sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.name.localeCompare(b.name);
    });
    const total = list.reduce((sum, c) => sum + c.voteCount, 0);
    return list.map((c) => ({
      rollNo: c.rollNo,
      name: c.name,
      hasPhoto: c.hasPhoto,
      voteCount: c.voteCount,
      percent: total > 0 ? Math.round((c.voteCount / total) * 1000) / 10 : 0,
    }));
  }

  const totalVotes = votesCount;
  const totalStudents = studentsCount;
  const turnoutPercent = totalStudents > 0 ? Math.round((totalVotes / totalStudents) * 1000) / 10 : 0;

  return {
    visible: true,
    totalVotes,
    totalStudents,
    turnoutPercent,
    CR: buildList('CR'),
    LR: buildList('LR'),
    updatedAt: new Date().toISOString(),
  };
}

async function getPublicResults() {
  const now = Date.now();
  if (cache.data && cache.expiresAt > now) {
    return cache.data;
  }
  const data = await computePublicResults();
  cache = { data, expiresAt: Date.now() + TTL_MS };
  return data;
}

module.exports = { getPublicResults, invalidateResultsCache, getResultsVisible };
