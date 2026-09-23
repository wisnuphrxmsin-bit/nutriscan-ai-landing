const { connectLambda, getStore } = require("@netlify/blobs");

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

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    body = {};
  }

  const store = getStore("stats");
  const totals = (await store.get("totals", { type: "json" })) || {
    visits: 0,
    orders: 0,
    packages: { basic: 0, monthly: 0, annual: 0 },
    referralUses: 0,
  };
  if (!totals.packages) totals.packages = { basic: 0, monthly: 0, annual: 0 };
  if (typeof totals.referralUses !== "number") totals.referralUses = 0;

  if (typeof body.visits === "number" && body.visits >= 0) {
    totals.visits = Math.round(body.visits);
  }
  if (typeof body.orders === "number" && body.orders >= 0) {
    totals.orders = Math.round(body.orders);
  }

  await store.setJSON("totals", totals);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, totals }),
  };
};
