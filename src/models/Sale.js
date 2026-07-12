const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    isCustom: { type: Boolean, default: false },
    name: { type: String, required: true },
    sku: { type: String },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    invoiceNo: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    items: { type: [saleItemSchema], required: true, validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['cash', 'card', 'bank', 'credit'], default: 'cash' },
    amountPaid: { type: Number, required: true, min: 0 },
    dueAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['completed', 'refunded', 'partially_refunded'], default: 'completed' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

saleSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
