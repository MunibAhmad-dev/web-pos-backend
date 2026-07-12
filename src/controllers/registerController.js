const asyncHandler = require('express-async-handler');
const CashRegister = require('../models/CashRegister');
const Transaction = require('../models/Transaction');

const getCurrentSession = asyncHandler(async (req, res) => {
  const session = await CashRegister.findOne({ owner: req.user._id, status: 'open' });
  res.json(session);
});

const getHistory = asyncHandler(async (req, res) => {
  const sessions = await CashRegister.find({ owner: req.user._id, status: 'closed' })
    .sort({ closedAt: -1 })
    .limit(100);
  res.json(sessions);
});

const openSession = asyncHandler(async (req, res) => {
  const existing = await CashRegister.findOne({ owner: req.user._id, status: 'open' });
  if (existing) {
    res.status(400);
    throw new Error('A register session is already open');
  }

  const { openingBalance = 0, notes } = req.body;
  const session = await CashRegister.create({ owner: req.user._id, openingBalance, notes });
  res.status(201).json(session);
});

const computeCashMovement = async (ownerId, from, to) => {
  const cashTx = await Transaction.find({
    owner: ownerId,
    method: 'cash',
    date: { $gte: from, $lte: to },
  });
  const cashIn = cashTx.filter((t) => t.direction === 'in').reduce((sum, t) => sum + t.amount, 0);
  const cashOut = cashTx.filter((t) => t.direction === 'out').reduce((sum, t) => sum + t.amount, 0);
  return { cashIn, cashOut };
};

const closeSession = asyncHandler(async (req, res) => {
  const session = await CashRegister.findOne({ _id: req.params.id, owner: req.user._id, status: 'open' });
  if (!session) {
    res.status(404);
    throw new Error('Open register session not found');
  }

  const { closingBalance, notes } = req.body;
  if (closingBalance === undefined || closingBalance < 0) {
    res.status(400);
    throw new Error('A valid closing (counted) balance is required');
  }

  const { cashIn, cashOut } = await computeCashMovement(req.user._id, session.openedAt, new Date());
  const expectedBalance = session.openingBalance + cashIn - cashOut;

  session.closingBalance = closingBalance;
  session.expectedBalance = expectedBalance;
  session.difference = closingBalance - expectedBalance;
  session.closedAt = new Date();
  session.status = 'closed';
  if (notes) session.notes = notes;
  await session.save();

  res.json(session);
});

const addCashMovement = asyncHandler(async (req, res) => {
  const session = await CashRegister.findOne({ owner: req.user._id, status: 'open' });
  if (!session) {
    res.status(400);
    throw new Error('No open register session. Open a session first.');
  }

  const { type, amount, description } = req.body;
  if (!['cash_in', 'cash_out'].includes(type) || !amount || amount <= 0) {
    res.status(400);
    throw new Error('Valid type (cash_in/cash_out) and positive amount are required');
  }

  const transaction = await Transaction.create({
    owner: req.user._id,
    type,
    direction: type === 'cash_in' ? 'in' : 'out',
    amount,
    method: 'cash',
    description,
    registerSession: session._id,
  });

  res.status(201).json(transaction);
});

module.exports = { getCurrentSession, getHistory, openSession, closeSession, addCashMovement };
