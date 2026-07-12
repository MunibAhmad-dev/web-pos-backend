const asyncHandler = require('express-async-handler');
const PurchaseOrder = require('../models/PurchaseOrder');
const Vendor = require('../models/Vendor');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');

const nextPoNumber = async (ownerId) => {
  const count = await PurchaseOrder.countDocuments({ owner: ownerId });
  return `PO-${String(count + 1).padStart(6, '0')}`;
};

const getPurchaseOrders = asyncHandler(async (req, res) => {
  const { status, vendor } = req.query;
  const filter = { owner: req.user._id };
  if (status) filter.status = status;
  if (vendor) filter.vendor = vendor;
  const orders = await PurchaseOrder.find(filter).populate('vendor', 'name').sort({ createdAt: -1 });
  res.json(orders);
});

const getPurchaseOrder = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, owner: req.user._id }).populate(
    'vendor',
    'name phone'
  );
  if (!order) {
    res.status(404);
    throw new Error('Purchase order not found');
  }
  res.json(order);
});

const createPurchaseOrder = asyncHandler(async (req, res) => {
  const { vendor, items, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('At least one item is required');
  }

  const vendorDoc = await Vendor.findOne({ _id: vendor, owner: req.user._id });
  if (!vendorDoc) {
    res.status(404);
    throw new Error('Vendor not found');
  }

  const productIds = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds }, owner: req.user._id });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  let totalCost = 0;
  const poItems = items.map((item) => {
    const product = productMap.get(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.product}`);
    }
    const lineTotal = item.unitCost * item.qty;
    totalCost += lineTotal;
    return { product: product._id, name: product.name, qty: item.qty, unitCost: item.unitCost, lineTotal };
  });

  const poNumber = await nextPoNumber(req.user._id);
  const order = await PurchaseOrder.create({
    owner: req.user._id,
    poNumber,
    vendor: vendorDoc._id,
    items: poItems,
    totalCost,
    notes,
  });

  res.status(201).json(order);
});

const receivePurchaseOrder = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, owner: req.user._id });
  if (!order) {
    res.status(404);
    throw new Error('Purchase order not found');
  }
  if (order.status !== 'pending') {
    res.status(400);
    throw new Error(`Purchase order is already ${order.status}`);
  }

  const { amountPaid = 0, updateCostPrice = true } = req.body;

  await Promise.all(
    order.items.map(async (item) => {
      const update = { $inc: { stockQty: item.qty } };
      await Product.updateOne({ _id: item.product }, update);
      if (updateCostPrice) {
        await Product.updateOne({ _id: item.product }, { $set: { costPrice: item.unitCost } });
      }
    })
  );

  order.status = 'received';
  order.receivedAt = new Date();
  order.amountPaid = Math.min(amountPaid, order.totalCost);
  await order.save();

  const vendor = await Vendor.findById(order.vendor);
  const owed = order.totalCost - order.amountPaid;
  vendor.balance += owed;
  await vendor.save();

  if (order.amountPaid > 0) {
    await Transaction.create({
      owner: req.user._id,
      type: 'purchase',
      direction: 'out',
      amount: order.amountPaid,
      method: req.body.method || 'cash',
      description: `Purchase ${order.poNumber}`,
      refModel: 'PurchaseOrder',
      refId: order._id,
      vendor: vendor._id,
    });
  }

  res.json(order);
});

const recordVendorPayment = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, owner: req.user._id });
  if (!order) {
    res.status(404);
    throw new Error('Purchase order not found');
  }
  const { amount, method = 'cash' } = req.body;
  const remaining = order.totalCost - order.amountPaid;
  if (!amount || amount <= 0 || amount > remaining) {
    res.status(400);
    throw new Error(`Payment must be between 0 and ${remaining}`);
  }

  order.amountPaid += amount;
  await order.save();

  const vendor = await Vendor.findById(order.vendor);
  vendor.balance -= amount;
  await vendor.save();

  await Transaction.create({
    owner: req.user._id,
    type: 'vendor_payment',
    direction: 'out',
    amount,
    method,
    description: `Payment for ${order.poNumber}`,
    refModel: 'PurchaseOrder',
    refId: order._id,
    vendor: vendor._id,
  });

  res.json(order);
});

const cancelPurchaseOrder = asyncHandler(async (req, res) => {
  const order = await PurchaseOrder.findOne({ _id: req.params.id, owner: req.user._id });
  if (!order) {
    res.status(404);
    throw new Error('Purchase order not found');
  }
  if (order.status !== 'pending') {
    res.status(400);
    throw new Error('Only pending purchase orders can be cancelled');
  }
  order.status = 'cancelled';
  await order.save();
  res.json(order);
});

module.exports = {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  receivePurchaseOrder,
  recordVendorPayment,
  cancelPurchaseOrder,
};
