const express = require('express');
const { getSales, getSale, createSale } = require('../controllers/saleController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getSales).post(createSale);
router.get('/:id', getSale);

module.exports = router;
