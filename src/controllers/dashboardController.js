const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Expense = require('../models/Expense');
const { getRange } = require('../utils/dateRange');

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getDashboard = asyncHandler(async (req, res) => {
  const { period = 'week', from, to } = req.query;
  const { start, end } = getRange(period, from, to);
  const owner = req.user._id;

  const sales = await Sale.find({ owner, createdAt: { $gte: start, $lte: end } });
  const periodRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const grossProfit = sales.reduce(
    (sum, s) => sum + s.items.reduce((iSum, i) => iSum + (i.unitPrice - i.unitCost) * i.qty, 0),
    0
  );
  const transactionsCount = sales.length;

  const { start: tStart, end: tEnd } = todayRange();
  const todaySales = await Sale.find({ owner, createdAt: { $gte: tStart, $lte: tEnd } });
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);

  const products = await Product.find({ owner, isActive: true });
  const stockValue = products.reduce((sum, p) => sum + p.costPrice * p.stockQty, 0);
  const retailStockValue = products.reduce((sum, p) => sum + p.retailPrice * p.stockQty, 0);
  const lowStockProducts = products.filter((p) => p.stockQty <= p.reorderThreshold);

  const customers = await Customer.find({ owner });
  const customerCreditAR = customers.reduce((sum, c) => sum + c.creditBalance, 0);
  const arDebtorsCount = customers.filter((c) => c.creditBalance > 0).length;

  const revenueTrend = await Sale.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(owner), createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        total: { $sum: '$total' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({
    period: { start, end },
    kpis: {
      periodRevenue,
      grossProfit,
      transactionsCount,
      todayRevenue,
      stockValue,
      retailStockValue,
      retailProfit: retailStockValue - stockValue,
      customerCreditAR,
      arDebtorsCount,
      lowStockCount: lowStockProducts.length,
    },
    revenueTrend: revenueTrend.map((d) => ({ date: d._id, total: d.total })),
    stockSummary: {
      totalItems: products.length,
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 10).map((p) => ({ id: p._id, name: p.name, stockQty: p.stockQty })),
    },
  });
});

const getProfitAndLoss = asyncHandler(async (req, res) => {
  const owner = req.user._id;
  const { days = 30 } = req.query;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - (Number(days) - 1));
  start.setHours(0, 0, 0, 0);

  const [salesByDay, expensesByDay] = await Promise.all([
    Sale.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(owner), createdAt: { $gte: start, $lte: end } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$items.lineTotal' },
          cogs: { $sum: { $multiply: ['$items.unitCost', '$items.qty'] } },
        },
      },
    ]),
    Expense.aggregate([
      { $match: { owner: new mongoose.Types.ObjectId(owner), date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          expenses: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const byDate = new Map();
  salesByDay.forEach((d) => byDate.set(d._id, { date: d._id, revenue: d.revenue, cogs: d.cogs, expenses: 0 }));
  expensesByDay.forEach((d) => {
    const entry = byDate.get(d._id) || { date: d._id, revenue: 0, cogs: 0, expenses: 0 };
    entry.expenses = d.expenses;
    byDate.set(d._id, entry);
  });

  const series = Array.from(byDate.values())
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((d) => ({
      ...d,
      gross: d.revenue - d.cogs,
      net: d.revenue - d.cogs - d.expenses,
    }));

  const totals = series.reduce(
    (acc, d) => ({
      revenue: acc.revenue + d.revenue,
      cogs: acc.cogs + d.cogs,
      expenses: acc.expenses + d.expenses,
      gross: acc.gross + d.gross,
      net: acc.net + d.net,
    }),
    { revenue: 0, cogs: 0, expenses: 0, gross: 0, net: 0 }
  );

  res.json({ series, totals });
});

const getTopProducts = asyncHandler(async (req, res) => {
  const owner = req.user._id;
  const { from, to, limit = 10 } = req.query;
  const match = { owner: new mongoose.Types.ObjectId(owner) };
  if (from && to) {
    match.createdAt = { $gte: new Date(from), $lte: new Date(to) };
  }

  const topProducts = await Sale.aggregate([
    { $match: match },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        qtySold: { $sum: '$items.qty' },
        revenue: { $sum: '$items.lineTotal' },
      },
    },
    { $sort: { qtySold: -1 } },
    { $limit: Number(limit) },
  ]);

  res.json(topProducts);
});

module.exports = { getDashboard, getProfitAndLoss, getTopProducts };
