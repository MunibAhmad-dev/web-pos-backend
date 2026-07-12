const express = require('express');
const {
  getVendors,
  getVendor,
  createVendor,
  updateVendor,
  deleteVendor,
} = require('../controllers/vendorController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.route('/').get(getVendors).post(createVendor);
router.route('/:id').get(getVendor).put(updateVendor).delete(deleteVendor);

module.exports = router;
