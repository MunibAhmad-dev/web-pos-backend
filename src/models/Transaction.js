const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'sale',
        'purchase',
        'expense',
        'sale_return',
        'purchase_return',
        'cash_in',
        'cash_out',
        'customer_payment',
        'vendor_payment',
      ],
      required: true,
    },
    direction: { type: String, enum: ['in', 'out'], required: true },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['cash', 'card', 'bank', 'credit'], default: 'cash' },
    description: { type: String, trim: true },
    refModel: { type: String },
    refId: { type: mongoose.Schema.Types.ObjectId },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    registerSession: { type: mongoose.Schema.Types.ObjectId, ref: 'CashRegister' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

transactionSchema.index({ owner: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
