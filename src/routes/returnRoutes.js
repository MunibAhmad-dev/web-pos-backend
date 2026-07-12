const express = require('express');
const { getReturns, createSaleReturn, createPurchaseReturn } = require('../controllers/returnController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', getReturns);
router.post('/sale', createSaleReturn);
router.post('/purchase', createPurchaseReturn);

module.exports = router;
