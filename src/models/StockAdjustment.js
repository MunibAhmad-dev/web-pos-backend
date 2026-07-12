const mongoose = require('mongoose');

const stockAdjustmentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: ['increase', 'decrease'], required: true },
    quantity: { type: Number, required: true, min: 1 },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockAdjustment', stockAdjustmentSchema);
