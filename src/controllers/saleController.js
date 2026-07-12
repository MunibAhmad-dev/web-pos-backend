const asyncHandler = require('express-async-handler');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const CashRegister = require('../models/CashRegister');

const nextInvoiceNo = async (ownerId) => {
  const count = await Sale.countDocuments({ owner: ownerId });
  return `INV-${String(count + 1).padStart(6, '0')}`;
};

const getSales = asyncHandler(async (req, res) => {
  const { from, to, customer, status } = req.query;
  const filter = { owner: req.user._id };
  if (customer) filter.customer = customer;
  if (status) filter.status = status;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const sales = await Sale.find(filter).populate('customer', 'name phone').sort({ createdAt: -1 });
  res.json(sales);
});

const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: req.params.id, owner: req.user._id }).populate(
    'customer',
    'name phone email'
  );
  if (!sale) {
    res.status(404);
    throw new Error('Sale not found');
  }
  res.json(sale);
});

const createSale = asyncHandler(async (req, res) => {
  const { items, discount = 0, tax = 0, paymentMethod = 'cash', amountPaid, customer, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('At least one item is required');
  }

  const productIds = items.filter((i) => !i.isCustom).map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds }, owner: req.user._id });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  let subtotal = 0;
  const saleItems = [];

  for (const item of items) {
    if (item.qty <= 0) {
      res.status(400);
      throw new Error('Invalid quantity');
    }

    if (item.isCustom) {
      if (!item.name || item.unitPrice === undefined) {
        res.status(400);
        throw new Error('Custom items require a name and price');
      }
      const unitPrice = Number(item.unitPrice);
      const lineTotal = unitPrice * item.qty;
      subtotal += lineTotal;
      saleItems.push({
        isCustom: true,
        name: item.name,
        qty: item.qty,
        unitPrice,
        unitCost: 0,
        lineTotal,
      });
      continue;
    }

    const product = productMap.get(item.product);
    if (!product) {
      res.status(404);
      throw new Error(`Product not found: ${item.product}`);
    }
    if (product.stockQty < item.qty) {
      res.status(400);
      throw new Error(`Insufficient stock for ${product.name} (available: ${product.stockQty})`);
    }

    const unitPrice = item.unitPrice ?? product.retailPrice;
    const lineTotal = unitPrice * item.qty;
    subtotal += lineTotal;

    saleItems.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      qty: item.qty,
      unitPrice,
      unitCost: product.costPrice,
      lineTotal,
    });
  }

  const total = Math.max(subtotal - discount + tax, 0);
  const paid = amountPaid !== undefined ? amountPaid : total;
  const dueAmount = Math.max(total - paid, 0);

  let customerDoc = null;
  if (customer) {
    customerDoc = await Customer.findOne({ _id: customer, owner: req.user._id });
    if (!customerDoc) {
      res.status(404);
      throw new Error('Customer not found');
    }
  }
  if (dueAmount > 0 && !customerDoc) {
    res.status(400);
    throw new Error('A customer must be selected to record a due/credit amount');
  }

  const invoiceNo = await nextInvoiceNo(req.user._id);

  const sale = await Sale.create({
    owner: req.user._id,
    invoiceNo,
    customer: customerDoc?._id,
    items: saleItems,
    subtotal,
    discount,
    tax,
    total,
    paymentMethod,
    amountPaid: paid,
    dueAmount,
    notes,
  });

  await Promise.all(
    saleItems
      .filter((item) => !item.isCustom)
      .map((item) => Product.updateOne({ _id: item.product }, { $inc: { stockQty: -item.qty } }))
  );

  if (customerDoc && dueAmount > 0) {
    customerDoc.creditBalance += dueAmount;
    await customerDoc.save();
  }

  const openRegister = await CashRegister.findOne({ owner: req.user._id, status: 'open' });

  if (paid > 0) {
    await Transaction.create({
      owner: req.user._id,
      type: 'sale',
      direction: 'in',
      amount: paid,
      method: paymentMethod,
      description: `Sale ${invoiceNo}`,
      refModel: 'Sale',
      refId: sale._id,
      customer: customerDoc?._id,
      registerSession: openRegister?._id,
    });
  }

  res.status(201).json(sale);
});

module.exports = { getSales, getSale, createSale };
