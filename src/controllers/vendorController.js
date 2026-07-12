const asyncHandler = require('express-async-handler');
const Vendor = require('../models/Vendor');
const PurchaseOrder = require('../models/PurchaseOrder');

const getVendors = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const filter = { owner: req.user._id };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }
  const vendors = await Vendor.find(filter).sort({ name: 1 });
  res.json(vendors);
});

const getVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, owner: req.user._id });
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }
  const purchaseOrders = await PurchaseOrder.find({ owner: req.user._id, vendor: vendor._id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json({ vendor, purchaseOrders });
});

const createVendor = asyncHandler(async (req, res) => {
  const { name, phone, email, address, notes } = req.body;
  if (!name) {
    res.status(400);
    throw new Error('Vendor name is required');
  }
  const vendor = await Vendor.create({ owner: req.user._id, name, phone, email, address, notes });
  res.status(201).json(vendor);
});

const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, owner: req.user._id });
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }
  ['name', 'phone', 'email', 'address', 'notes'].forEach((field) => {
    if (req.body[field] !== undefined) vendor[field] = req.body[field];
  });
  await vendor.save();
  res.json(vendor);
});

const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, owner: req.user._id });
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }
  if (vendor.balance > 0) {
    res.status(400);
    throw new Error('Cannot delete a vendor with an outstanding balance');
  }
  await vendor.deleteOne();
  res.json({ message: 'Vendor deleted' });
});

module.exports = { getVendors, getVendor, createVendor, updateVendor, deleteVendor };
