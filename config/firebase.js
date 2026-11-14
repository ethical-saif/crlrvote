const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (sa.private_key) {
      sa.private_key = sa.private_key.replace(/\\n/g, '\n');
    }
    credential = cert(sa);
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
    process.exit(1);
  }
} else {
  const keyPath = path.join(__dirname, '..', 'privatekey.json');
  if (!fs.existsSync(keyPath)) {
    console.error('Firebase credentials not found: set FIREBASE_SERVICE_ACCOUNT or provide privatekey.json in project root.');
    process.exit(1);
  }
  const sa = require(keyPath);
  credential = cert(sa);
}

const app = initializeApp({ credential });
const db = getFirestore(app);

module.exports = { app, db };

