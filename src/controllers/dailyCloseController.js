const asyncHandler = require('express-async-handler');
const DailyClose = require('../models/DailyClose');
const Sale = require('../models/Sale');
const Expense = require('../models/Expense');
const Transaction = require('../models/Transaction');

const dayRange = (dateStr) => {
  const date = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const computeSummary = async (ownerId, dateStr) => {
  const { start, end } = dayRange(dateStr);

  const [sales, expenses, transactions] = await Promise.all([
    Sale.find({ owner: ownerId, createdAt: { $gte: start, $lte: end } }),
    Expense.find({ owner: ownerId, date: { $gte: start, $lte: end } }),
    Transaction.find({ owner: ownerId, method: 'cash', date: { $gte: start, $lte: end } }),
  ]);

  const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const cashIn = transactions.filter((t) => t.direction === 'in').reduce((sum, t) => sum + t.amount, 0);
  const cashOut = transactions.filter((t) => t.direction === 'out').reduce((sum, t) => sum + t.amount, 0);

  return { date: start, totalSales, totalExpenses, cashIn, cashOut, netCash: cashIn - cashOut };
};

const getSummary = asyncHandler(async (req, res) => {
  const summary = await computeSummary(req.user._id, req.query.date);
  res.json(summary);
});

const closeDay = asyncHandler(async (req, res) => {
  const { date, notes } = req.body;
  const { start } = dayRange(date);

  const existing = await DailyClose.findOne({ owner: req.user._id, date: start });
  if (existing) {
    res.status(400);
    throw new Error('This day has already been closed');
  }

  const summary = await computeSummary(req.user._id, date);
  const record = await DailyClose.create({ owner: req.user._id, ...summary, notes });
  res.status(201).json(record);
});

const getHistory = asyncHandler(async (req, res) => {
  const records = await DailyClose.find({ owner: req.user._id }).sort({ date: -1 }).limit(100);
  res.json(records);
});

module.exports = { getSummary, closeDay, getHistory };
