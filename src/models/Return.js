const mongoose = require('mongoose');

const returnItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const returnSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['sale', 'purchase'], required: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    items: { type: [returnItemSchema], required: true, validate: (v) => v.length > 0 },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

returnSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('Return', returnSchema);
