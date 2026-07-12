const express = require('express');
const {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  receivePurchaseOrder,
  recordVendorPayment,
  cancelPurchaseOrder,
} = require('../controllers/purchaseController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getPurchaseOrders).post(createPurchaseOrder);
router.get('/:id', getPurchaseOrder);
router.post('/:id/receive', receivePurchaseOrder);
router.post('/:id/pay', recordVendorPayment);
router.post('/:id/cancel', cancelPurchaseOrder);

module.exports = router;
