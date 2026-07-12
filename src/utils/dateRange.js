const getRange = (period, from, to) => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === 'custom' && from && to) {
    const customStart = new Date(from);
    customStart.setHours(0, 0, 0, 0);
    const customEnd = new Date(to);
    customEnd.setHours(23, 59, 59, 999);
    return { start: customStart, end: customEnd };
  }

  switch (period) {
    case 'today':
      return { start, end };
    case 'month':
      start.setDate(1);
      return { start, end };
    case 'year':
      start.setMonth(0, 1);
      return { start, end };
    case 'week':
    default:
      start.setDate(start.getDate() - 6);
      return { start, end };
  }
};

module.exports = { getRange };
