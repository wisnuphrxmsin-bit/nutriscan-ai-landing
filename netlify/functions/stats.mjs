const { connectLambda, getStore } = require("@netlify/blobs");

function toBangkokDate(iso) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

// GET /.netlify/functions/stats   (also reachable at /api/stats via redirect)
// Optional query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD  -> adds "rangeTotals"
// Requires header  x-admin-key: <value of the ADMIN_KEY env var set in Netlify>
exports.handler = async (event) => {
  connectLambda(event);

  const adminKey = process.env.ADMIN_KEY;
  const headers = event.headers || {};
  const provided = headers["x-admin-key"] || headers["X-Admin-Key"];

  if (!adminKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ADMIN_KEY is not set on this site" }),
    };
  }

  if (provided !== adminKey) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "unauthorized" }),
    };
  }

  const store = getStore("stats");

  const recentVisits = (await store.get("recent_visit", { type: "json" })) || [];
  const recentOrders = (await store.get("recent_order", { type: "json" })) || [];

  // Per-day breakdown, built from the SAME logs shown below, so the
  // numbers can never disagree with each other. Capped at the last 100
  // events per type, so very old days may undercount once traffic grows.
  const dailyMap = {};
  function bump(list, field) {
    list.forEach((item) => {
      const date = toBangkokDate(item.ts);
      if (!date) return;
      if (!dailyMap[date]) dailyMap[date] = { date, visits: 0, orders: 0 };
      dailyMap[date][field] += 1;
    });
  }
  bump(recentVisits, "visits");
  bump(recentOrders, "orders");
  const daily = Object.values(dailyMap).sort((a, b) =>
    a.date < b.date ? 1 : -1
  );

  // Summary numbers = sum of the same logs (kept consistent with "daily").
  const visits = daily.reduce((s, d) => s + d.visits, 0);
  const orders = daily.reduce((s, d) => s + d.orders, 0);

  // Package + referral breakdown, derived from recentOrders.
  const packageBreakdown = { basic: 0, monthly: 0, annual: 0 };
  let referralUses = 0;
  recentOrders.forEach((o) => {
    if (o.package && Object.prototype.hasOwnProperty.call(packageBreakdown, o.package)) {
      packageBreakdown[o.package] += 1;
    }
    if (o.referral) referralUses += 1;
  });

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
      visits,
      orders,
      conversionRate: visits > 0 ? +((orders / visits) * 100).toFixed(2) : 0,
      recentVisits,
      recentOrders,
      daily,
      rangeTotals,
      packageBreakdown,
      referralUses,
    }),
  };
};
