const { connectLambda, getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  connectLambda(event);

  const adminKey = process.env.ADMIN_KEY;
  const headers = event.headers || {};
  const provided = headers["x-admin-key"] || headers["X-Admin-Key"];

  if (!adminKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "ADMIN_KEY is not set on this site" }) };
  }
  if (provided !== adminKey) {
    return { statusCode: 401, body: JSON.stringify({ error: "unauthorized" }) };
  }

  const store = getStore("stats");

  const totals = (await store.get("totals", { type: "json" })) || {
    visits: 0,
    orders: 0,
    packages: { basic: 0, monthly: 0, annual: 0 },
    referralUses: 0,
  };
  const packageBreakdown = totals.packages || { basic: 0, monthly: 0, annual: 0 };
  const referralUses = totals.referralUses || 0;

  const daily = [];
  const { blobs } = await store.list({ prefix: "daily:" });
  for (const item of blobs) {
    const date = item.key.replace("daily:", "");
    const value = (await store.get(item.key, { type: "json" })) || { visits: 0, orders: 0 };
    daily.push({ date, visits: value.visits || 0, orders: value.orders || 0 });
  }
  daily.sort((a, b) => (a.date < b.date ? 1 : -1));

  const qs = event.queryStringParameters || {};
  const from = qs.from;
  const to = qs.to;
  let rangeTotals = null;
  if (from && to) {
    rangeTotals = daily.reduce(
      (acc, d) => {
        if (d.date >= from && d.date <= to) {
          acc.visits += d.visits;
          acc.orders += d.orders;
        }
        return acc;
      },
      { visits: 0, orders: 0, from, to }
    );
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visits: totals.visits || 0,
      orders: totals.orders || 0,
      conversionRate: totals.visits > 0 ? +((totals.orders / totals.visits) * 100).toFixed(2) : 0,
      daily,
      rangeTotals,
      packageBreakdown,
      referralUses,
    }),
  };
};
