const { connectLambda, getStore } = require("@netlify/blobs");

function bangkokDateString(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

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
  const field = type === "visit" ? "visits" : "orders";

  // 1. All-time running total (kept for convenience / backwards compatibility)
  const totalsKey = "totals";
  const totals = (await store.get(totalsKey, { type: "json" })) || {
    visits: 0,
    orders: 0,
  };
  totals[field] += 1;
  await store.setJSON(totalsKey, totals);

  // 2. Per-day counter (resets visually each day, but old days stay stored)
  const today = bangkokDateString();
  const dailyKey = "daily:" + today;
  const daily = (await store.get(dailyKey, { type: "json" })) || {
    visits: 0,
    orders: 0,
  };
  daily[field] += 1;
  await store.setJSON(dailyKey, daily);

  // 3. Keep a short recent-activity log (capped) so the dashboard can show
  //    the latest events, not just the totals.
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
    body: JSON.stringify({ ok: true, totals, daily: { date: today, ...daily } }),
  };
};
