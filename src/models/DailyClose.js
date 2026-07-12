const mongoose = require('mongoose');

const dailyCloseSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    totalSales: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    cashIn: { type: Number, default: 0 },
    cashOut: { type: Number, default: 0 },
    netCash: { type: Number, default: 0 },
    registerSession: { type: mongoose.Schema.Types.ObjectId, ref: 'CashRegister' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

dailyCloseSchema.index({ owner: 1, date: -1 });

module.exports = mongoose.model('DailyClose', dailyCloseSchema);
