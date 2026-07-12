const express = require('express');
const {
  getTransactions,
  getLedger,
  recordCustomerPayment,
  recordVendorPayment,
  deleteTransaction,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/', getTransactions);
router.get('/ledger', getLedger);
router.post('/customer-payment', recordCustomerPayment);
router.post('/vendor-payment', recordVendorPayment);
router.delete('/:id', deleteTransaction);

module.exports = router;
