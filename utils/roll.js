const ROLL_RE = /^\d{5}-[a-z]{2}-\d{3}$/;

function normalizeRoll(rollNo) {
  if (typeof rollNo !== 'string') return '';
  return rollNo.trim().toLowerCase();
}

function isValidRollFormat(rollNo) {
  return ROLL_RE.test(rollNo);
}

module.exports = { normalizeRoll, isValidRollFormat };
