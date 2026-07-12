const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, businessName, email, password, phone } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    res.status(400);
    throw new Error('An account with this email already exists');
  }

  const user = await User.create({ name, businessName, email, password, phone });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    businessName: user.businessName,
    email: user.email,
    role: user.role,
    currency: user.currency,
    token: generateToken(user._id),
  });
});

// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email?.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.json({
    _id: user._id,
    name: user.name,
    businessName: user.businessName,
    email: user.email,
    role: user.role,
    currency: user.currency,
    token: generateToken(user._id),
  });
});

// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

// @route PUT /api/auth/me
const updateMe = asyncHandler(async (req, res) => {
  const { name, businessName, phone, currency, lowStockThreshold } = req.body;
  const user = await User.findById(req.user._id);

  if (name !== undefined) user.name = name;
  if (businessName !== undefined) user.businessName = businessName;
  if (phone !== undefined) user.phone = phone;
  if (currency !== undefined) user.currency = currency;
  if (lowStockThreshold !== undefined) user.lowStockThreshold = lowStockThreshold;

  await user.save();
  res.json(user);
});

module.exports = { register, login, getMe, updateMe };
