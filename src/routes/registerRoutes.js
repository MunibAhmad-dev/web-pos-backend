const express = require('express');
const {
  getCurrentSession,
  getHistory,
  openSession,
  closeSession,
  addCashMovement,
} = require('../controllers/registerController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router.get('/current', getCurrentSession);
router.get('/history', getHistory);
router.post('/open', openSession);
router.post('/:id/close', closeSession);
router.post('/cash-movement', addCashMovement);

module.exports = router;
