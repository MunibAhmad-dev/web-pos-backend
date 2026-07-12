const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getStockAdjustments,
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/adjustments', getStockAdjustments);
router.route('/').get(getProducts).post(createProduct);
router.route('/:id').get(getProduct).put(updateProduct).delete(deleteProduct);
router.post('/:id/adjust', adjustStock);

module.exports = router;
