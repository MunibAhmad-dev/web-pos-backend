const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    paymentMethod: { type: String, enum: ['cash', 'card', 'bank'], default: 'cash' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

expenseSchema.index({ owner: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
