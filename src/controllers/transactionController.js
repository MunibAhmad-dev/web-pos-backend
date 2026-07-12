const asyncHandler = require('express-async-handler');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');

const getTransactions = asyncHandler(async (req, res) => {
  const { type, method, from, to, customer, vendor } = req.query;
  const filter = { owner: req.user._id };
  if (type) filter.type = type;
  if (method) filter.method = method;
  if (customer) filter.customer = customer;
  if (vendor) filter.vendor = vendor;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  const transactions = await Transaction.find(filter)
    .populate('customer', 'name')
    .populate('vendor', 'name')
    .sort({ date: -1 })
    .limit(500);
  res.json(transactions);
});

const getLedger = asyncHandler(async (req, res) => {
  const { party = 'customer' } = req.query;
  const field = party === 'vendor' ? 'vendor' : 'customer';
  const Model = party === 'vendor' ? Vendor : Customer;

  const parties = await Model.find({ owner: req.user._id }).sort({ name: 1 });
  const transactions = await Transaction.find({ owner: req.user._id, [field]: { $ne: null } }).sort({
    date: -1,
  });

  const grouped = parties.map((p) => ({
    party: p,
    balance: party === 'vendor' ? p.balance : p.creditBalance,
    transactions: transactions.filter((t) => t[field]?.toString() === p._id.toString()),
  }));

  res.json(grouped);
});

const recordCustomerPayment = asyncHandler(async (req, res) => {
  const { customerId, amount, method = 'cash' } = req.body;
  const customer = await Customer.findOne({ _id: customerId, owner: req.user._id });
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  if (!amount || amount <= 0 || amount > customer.creditBalance) {
    res.status(400);
    throw new Error(`Payment must be between 0 and ${customer.creditBalance}`);
  }

  customer.creditBalance -= amount;
  await customer.save();

  const transaction = await Transaction.create({
    owner: req.user._id,
    type: 'customer_payment',
    direction: 'in',
    amount,
    method,
    description: `Payment from ${customer.name}`,
    customer: customer._id,
  });

  res.status(201).json(transaction);
});

const recordVendorPayment = asyncHandler(async (req, res) => {
  const { vendorId, amount, method = 'cash' } = req.body;
  const vendor = await Vendor.findOne({ _id: vendorId, owner: req.user._id });
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }
  if (!amount || amount <= 0 || amount > vendor.balance) {
    res.status(400);
    throw new Error(`Payment must be between 0 and ${vendor.balance}`);
  }

  vendor.balance -= amount;
  await vendor.save();

  const transaction = await Transaction.create({
    owner: req.user._id,
    type: 'vendor_payment',
    direction: 'out',
    amount,
    method,
    description: `Payment to ${vendor.name}`,
    vendor: vendor._id,
  });

  res.status(201).json(transaction);
});

const DELETABLE_TYPES = ['cash_in', 'cash_out', 'customer_payment', 'vendor_payment'];

const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({ _id: req.params.id, owner: req.user._id });
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }
  if (!DELETABLE_TYPES.includes(transaction.type)) {
    res.status(400);
    throw new Error('This transaction is generated from another record and cannot be deleted directly');
  }

  if (transaction.type === 'customer_payment' && transaction.customer) {
    await Customer.updateOne({ _id: transaction.customer }, { $inc: { creditBalance: transaction.amount } });
  }
  if (transaction.type === 'vendor_payment' && transaction.vendor) {
    await Vendor.updateOne({ _id: transaction.vendor }, { $inc: { balance: transaction.amount } });
  }

  await transaction.deleteOne();
  res.json({ message: 'Transaction deleted' });
});

module.exports = { getTransactions, getLedger, recordCustomerPayment, recordVendorPayment, deleteTransaction };
