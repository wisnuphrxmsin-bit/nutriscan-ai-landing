const { connectLambda, getStore } = require("@netlify/blobs");

// GET /.netlify/functions/stats   (also reachable at /api/stats via redirect)
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
  const totals = (await store.get("totals", { type: "json" })) || {
    visits: 0,
    orders: 0,
  };
  const recentVisits = (await store.get("recent_visit", { type: "json" })) || [];
  const recentOrders = (await store.get("recent_order", { type: "json" })) || [];

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visits: totals.visits || 0,
      orders: totals.orders || 0,
      conversionRate:
        totals.visits > 0
          ? +((totals.orders / totals.visits) * 100).toFixed(2)
          : 0,
      recentVisits,
      recentOrders,
    }),
  };
};
