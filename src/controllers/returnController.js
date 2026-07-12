const asyncHandler = require('express-async-handler');
const Return = require('../models/Return');
const Sale = require('../models/Sale');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const Transaction = require('../models/Transaction');

const getReturns = asyncHandler(async (req, res) => {
  const { type } = req.query;
  const filter = { owner: req.user._id };
  if (type) filter.type = type;
  const returns = await Return.find(filter)
    .populate('customer', 'name')
    .populate('vendor', 'name')
    .sort({ createdAt: -1 });
  res.json(returns);
});

const createSaleReturn = asyncHandler(async (req, res) => {
  const { saleId, items, reason, method = 'cash' } = req.body;

  const sale = await Sale.findOne({ _id: saleId, owner: req.user._id });
  if (!sale) {
    res.status(404);
    throw new Error('Sale not found');
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('At least one item is required');
  }

  const saleItemMap = new Map(
    sale.items.filter((i) => i.product).map((i) => [i.product.toString(), i])
  );
  let amount = 0;
  const returnItems = [];

  for (const item of items) {
    const saleItem = saleItemMap.get(item.product);
    if (!saleItem) {
      res.status(400);
      throw new Error('Item was not part of this sale');
    }
    if (item.qty <= 0 || item.qty > saleItem.qty) {
      res.status(400);
      throw new Error(`Invalid return quantity for ${saleItem.name}`);
    }
    amount += saleItem.unitPrice * item.qty;
    returnItems.push({ product: saleItem.product, name: saleItem.name, qty: item.qty, unitPrice: saleItem.unitPrice });
  }

  await Promise.all(
    returnItems.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stockQty: item.qty } }))
  );

  let customerDoc = null;
  let creditApplied = 0;
  if (sale.customer) {
    customerDoc = await Customer.findById(sale.customer);
    if (customerDoc && sale.dueAmount > 0) {
      creditApplied = Math.min(amount, sale.dueAmount, customerDoc.creditBalance);
      customerDoc.creditBalance -= creditApplied;
      sale.dueAmount -= creditApplied;
      await customerDoc.save();
    }
  }

  const cashRefund = amount - creditApplied;

  const previousReturns = await Return.find({ owner: req.user._id, sale: sale._id });
  const previouslyReturned = previousReturns.reduce((sum, r) => sum + r.amount, 0);
  sale.status = previouslyReturned + amount >= sale.total ? 'refunded' : 'partially_refunded';
  await sale.save();

  const returnDoc = await Return.create({
    owner: req.user._id,
    type: 'sale',
    sale: sale._id,
    customer: customerDoc?._id,
    items: returnItems,
    amount,
    reason,
  });

  if (cashRefund > 0) {
    await Transaction.create({
      owner: req.user._id,
      type: 'sale_return',
      direction: 'out',
      amount: cashRefund,
      method,
      description: `Return for ${sale.invoiceNo}`,
      refModel: 'Return',
      refId: returnDoc._id,
      customer: customerDoc?._id,
    });
  }

  res.status(201).json(returnDoc);
});

const createPurchaseReturn = asyncHandler(async (req, res) => {
  const { purchaseOrderId, items, reason, method = 'cash' } = req.body;

  const order = await PurchaseOrder.findOne({ _id: purchaseOrderId, owner: req.user._id });
  if (!order) {
    res.status(404);
    throw new Error('Purchase order not found');
  }
  if (order.status !== 'received') {
    res.status(400);
    throw new Error('Only received purchase orders can be returned');
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('At least one item is required');
  }

  const poItemMap = new Map(order.items.map((i) => [i.product.toString(), i]));
  let amount = 0;
  const returnItems = [];

  for (const item of items) {
    const poItem = poItemMap.get(item.product);
    if (!poItem) {
      res.status(400);
      throw new Error('Item was not part of this purchase order');
    }
    const product = await Product.findById(item.product);
    if (item.qty <= 0 || item.qty > poItem.qty || product.stockQty < item.qty) {
      res.status(400);
      throw new Error(`Invalid return quantity for ${poItem.name}`);
    }
    amount += poItem.unitCost * item.qty;
    returnItems.push({ product: poItem.product, name: poItem.name, qty: item.qty, unitPrice: poItem.unitCost });
  }

  await Promise.all(
    returnItems.map((item) => Product.updateOne({ _id: item.product }, { $inc: { stockQty: -item.qty } }))
  );

  const vendor = await Vendor.findById(order.vendor);
  vendor.balance -= amount;
  await vendor.save();

  const returnDoc = await Return.create({
    owner: req.user._id,
    type: 'purchase',
    purchaseOrder: order._id,
    vendor: vendor._id,
    items: returnItems,
    amount,
    reason,
  });

  await Transaction.create({
    owner: req.user._id,
    type: 'purchase_return',
    direction: 'in',
    amount,
    method,
    description: `Return for ${order.poNumber}`,
    refModel: 'Return',
    refId: returnDoc._id,
    vendor: vendor._id,
  });

  res.status(201).json(returnDoc);
});

module.exports = { getReturns, createSaleReturn, createPurchaseReturn };
