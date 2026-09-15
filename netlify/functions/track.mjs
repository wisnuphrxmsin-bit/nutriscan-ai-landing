const { connectLambda, getStore } = require("@netlify/blobs");

// POST /.netlify/functions/track   (also reachable at /api/track via redirect)
// body: { "type": "visit" | "order", "page": "/" }
exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "method not allowed" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    body = {};
  }

  const type = body.type;
  if (type !== "visit" && type !== "order") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "invalid type" }),
    };
  }

  const store = getStore("stats");

  // 1. All-time running total.
  const totalsKey = "totals";
  const totals = (await store.get(totalsKey, { type: "json" })) || {
    visits: 0,
    orders: 0,
  };
  totals[type === "visit" ? "visits" : "orders"] += 1;
  await store.setJSON(totalsKey, totals);

  // 2. Keep a recent-activity log (capped) — this is also what the
  //    dashboard uses to build the per-day breakdown table.
  const logKey = "recent_" + type;
  const log = (await store.get(logKey, { type: "json" })) || [];
  log.unshift({
    ts: new Date().toISOString(),
    page: typeof body.page === "string" ? body.page.slice(0, 200) : "/",
  });
  await store.setJSON(logKey, log.slice(0, 100));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, totals }),
  };
};
