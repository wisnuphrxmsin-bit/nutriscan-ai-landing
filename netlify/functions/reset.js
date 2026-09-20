const { connectLambda, getStore } = require("@netlify/blobs");

// POST /.netlify/functions/reset   (also reachable at /api/reset via redirect)
// Requires header  x-admin-key: <value of the ADMIN_KEY env var set in Netlify>
exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "method not allowed" }),
    };
  }

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

  await store.setJSON("totals", { visits: 0, orders: 0 });
  await store.setJSON("recent_visit", []);
  await store.setJSON("recent_order", []);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};
