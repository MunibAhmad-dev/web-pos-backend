const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const StockAdjustment = require('../models/StockAdjustment');

const getProducts = asyncHandler(async (req, res) => {
  const { search, category, lowStock } = req.query;
  const filter = { owner: req.user._id };

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
    ];
  }
  if (category) filter.category = category;

  let products = await Product.find(filter).populate('category', 'name').sort({ createdAt: -1 });

  if (lowStock === 'true') {
    products = products.filter((p) => p.stockQty <= p.reorderThreshold);
  }

  res.json(products);
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, owner: req.user._id }).populate(
    'category',
    'name'
  );
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  res.json(product);
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, sku, barcode, category, unit, costPrice, retailPrice, stockQty, reorderThreshold, imageUrl } =
    req.body;

  if (!name) {
    res.status(400);
    throw new Error('Product name is required');
  }

  const product = await Product.create({
    owner: req.user._id,
    name,
    sku,
    barcode,
    category: category || undefined,
    unit,
    costPrice,
    retailPrice,
    stockQty: stockQty || 0,
    reorderThreshold,
    imageUrl,
  });

  res.status(201).json(product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, owner: req.user._id });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const fields = [
    'name',
    'sku',
    'barcode',
    'category',
    'unit',
    'costPrice',
    'retailPrice',
    'reorderThreshold',
    'imageUrl',
    'isActive',
  ];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  await product.save();
  res.json(product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, owner: req.user._id });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }
  await product.deleteOne();
  res.json({ message: 'Product deleted' });
});

const adjustStock = asyncHandler(async (req, res) => {
  const { type, quantity, reason } = req.body;
  if (!['increase', 'decrease'].includes(type) || !quantity || quantity <= 0) {
    res.status(400);
    throw new Error('Valid type (increase/decrease) and positive quantity are required');
  }

  const product = await Product.findOne({ _id: req.params.id, owner: req.user._id });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  if (type === 'decrease' && product.stockQty < quantity) {
    res.status(400);
    throw new Error('Cannot decrease more than current stock');
  }

  product.stockQty += type === 'increase' ? quantity : -quantity;
  await product.save();

  await StockAdjustment.create({ owner: req.user._id, product: product._id, type, quantity, reason });

  res.json(product);
});

const getStockAdjustments = asyncHandler(async (req, res) => {
  const adjustments = await StockAdjustment.find({ owner: req.user._id })
    .populate('product', 'name sku')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(adjustments);
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getStockAdjustments,
};
