const express = require('express');
const { getPublicResults } = require('../utils/resultsCache');

const router = express.Router();

router.get('/results', async (req, res, next) => {
  try {
    const data = await getPublicResults();
    return res.json(data);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
