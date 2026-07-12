const express = require('express');
const { getSummary, closeDay, getHistory } = require('../controllers/dailyCloseController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/summary', getSummary);
router.get('/history', getHistory);
router.post('/', closeDay);

module.exports = router;
