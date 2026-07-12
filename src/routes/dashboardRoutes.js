const express = require('express');
const { getDashboard, getProfitAndLoss, getTopProducts } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', getDashboard);
router.get('/pnl', getProfitAndLoss);
router.get('/top-products', getTopProducts);

module.exports = router;
