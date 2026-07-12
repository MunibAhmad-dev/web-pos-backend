const asyncHandler = require('express-async-handler');
const Expense = require('../models/Expense');
const Transaction = require('../models/Transaction');

const getExpenses = asyncHandler(async (req, res) => {
  const { from, to, category } = req.query;
  const filter = { owner: req.user._id };
  if (category) filter.category = category;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  const expenses = await Expense.find(filter).sort({ date: -1 });
  res.json(expenses);
});

const createExpense = asyncHandler(async (req, res) => {
  const { category, amount, description, paymentMethod = 'cash', date } = req.body;
  if (!category || !amount || amount <= 0) {
    res.status(400);
    throw new Error('Category and a positive amount are required');
  }

  const expense = await Expense.create({
    owner: req.user._id,
    category,
    amount,
    description,
    paymentMethod,
    date: date || Date.now(),
  });

  await Transaction.create({
    owner: req.user._id,
    type: 'expense',
    direction: 'out',
    amount,
    method: paymentMethod,
    description: description || category,
    refModel: 'Expense',
    refId: expense._id,
    date: expense.date,
  });

  res.status(201).json(expense);
});

const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findOne({ _id: req.params.id, owner: req.user._id });
  if (!expense) {
    res.status(404);
    throw new Error('Expense not found');
  }
  await expense.deleteOne();
  await Transaction.deleteOne({ owner: req.user._id, refModel: 'Expense', refId: expense._id });
  res.json({ message: 'Expense deleted' });
});

module.exports = { getExpenses, createExpense, deleteExpense };
