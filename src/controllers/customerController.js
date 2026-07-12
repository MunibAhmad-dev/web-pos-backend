const asyncHandler = require('express-async-handler');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');

const getCustomers = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = { owner: req.user._id };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  const customers = await Customer.find(filter).sort({ name: 1 });
  res.json(customers);
});

const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, owner: req.user._id });
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  const sales = await Sale.find({ owner: req.user._id, customer: customer._id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ customer, sales });
});

const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Customer name is required');
  }
  const customer = await Customer.create({ owner: req.user._id, name, phone, email, address, notes });
  res.status(201).json(customer);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, owner: req.user._id });
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  ['name', 'phone', 'email', 'address', 'notes'].forEach((field) => {
    if (req.body[field] !== undefined) customer[field] = req.body[field];
  });
  await customer.save();
  res.json(customer);
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ _id: req.params.id, owner: req.user._id });
  if (!customer) {
    res.status(404);
    throw new Error('Customer not found');
  }
  if (customer.creditBalance > 0) {
    res.status(400);
    throw new Error('Cannot delete a customer with an outstanding credit balance');
  }
  await customer.deleteOne();
  res.json({ message: 'Customer deleted' });
});

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer };
