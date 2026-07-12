const mongoose = require('mongoose');

const cashRegisterSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    openingBalance: { type: Number, required: true, min: 0 },
    openedAt: { type: Date, default: Date.now },
    closingBalance: { type: Number, min: 0 },
    expectedBalance: { type: Number },
    difference: { type: Number },
    closedAt: { type: Date },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

cashRegisterSchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('CashRegister', cashRegisterSchema);
