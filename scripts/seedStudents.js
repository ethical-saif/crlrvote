require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { db } = require('../config/firebase');
const { normalizeRoll, isValidRollFormat } = require('../utils/roll');

async function seed() {
  const filePath = path.join(__dirname, 'students.json');
  if (!fs.existsSync(filePath)) {
    console.error('students.json not found in scripts/');
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let students;
  try {
    students = JSON.parse(raw);
  } catch (e) {
    console.error('Invalid JSON in students.json:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(students)) {
    console.error('students.json must be an array');
    process.exit(1);
  }

  let added = 0;
  let skipped = 0;
  const valid = [];
  for (const s of students) {
    const rollNo = normalizeRoll(s.rollNo);
    const name = typeof s.name === 'string' ? s.name.trim() : '';
    if (!isValidRollFormat(rollNo)) {
      console.warn(`Skipping invalid roll number: ${s.rollNo}`);
      skipped++;
      continue;
    }
    valid.push({ rollNo, name });
  }

  const batchSize = 500;
  for (let i = 0; i < valid.length; i += batchSize) {
    const chunk = valid.slice(i, i + batchSize);
    const refs = chunk.map((s) => db.collection('students').doc(s.rollNo));
    const snaps = await db.getAll(...refs);
    const batch = db.batch();
    let batchOps = 0;
    for (let j = 0; j < chunk.length; j++) {
      const s = chunk[j];
      const snap = snaps[j];
      if (snap.exists) {
        const data = snap.data() || {};
        const update = { rollNo: s.rollNo };
        if (s.name) update.name = s.name;
        if (typeof data.hasVoted === 'undefined') update.hasVoted = false;
        batch.set(refs[j], update, { merge: true });
      } else {
        batch.set(refs[j], { rollNo: s.rollNo, name: s.name, hasVoted: false });
        added++;
      }
      batchOps++;
    }
    if (batchOps > 0) await batch.commit();
  }

  console.log(`Seed complete. New students added: ${added}. Skipped (invalid): ${skipped}.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
