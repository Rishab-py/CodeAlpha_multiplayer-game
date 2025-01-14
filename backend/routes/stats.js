const express = require('express');
const { getPlayerStats, getPlayerHistory } = require('../controllers/statsController');

const router = express.Router();

router.get('/stats/:username', getPlayerStats); // Fetch player stats
router.get('/history/:username', getPlayerHistory); // Fetch player match history

module.exports = router;
