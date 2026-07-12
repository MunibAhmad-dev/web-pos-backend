const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    barcode: { type: String, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    unit: { type: String, default: 'pcs' },
    costPrice: { type: Number, required: true, default: 0, min: 0 },
    retailPrice: { type: Number, required: true, default: 0, min: 0 },
    stockQty: { type: Number, required: true, default: 0, min: 0 },
    reorderThreshold: { type: Number, default: 5, min: 0 },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ owner: 1, name: 1 });
productSchema.index({ owner: 1, sku: 1 });

module.exports = mongoose.model('Product', productSchema);
