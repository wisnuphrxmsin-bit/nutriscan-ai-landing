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

  await store.setJSON("totals", {
    visits: 0,
    orders: 0,
    packages: { basic: 0, monthly: 0, annual: 0 },
    referralUses: 0,
  });

  // Delete every per-day counter too.
  const { blobs } = await store.list({ prefix: "daily:" });
  for (const item of blobs) {
    await store.delete(item.key);
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};
