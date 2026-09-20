const { connectLambda, getStore } = require("@netlify/blobs");

// POST /.netlify/functions/track   (also reachable at /api/track via redirect)
// body: { "type": "visit" | "order", "page": "/",
//         "package"?: "basic" | "monthly" | "annual", "referral"?: boolean }
// Every call counts — there is no per-browser de-duplication server-side.
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

  // 2. Keep a recent-activity log (capped). For orders, this also records
  //    which package was chosen and whether a referral code was used —
  //    the dashboard derives the package/referral breakdown from this log.
  const logKey = "recent_" + type;
  const log = (await store.get(logKey, { type: "json" })) || [];
  const entry = {
    ts: new Date().toISOString(),
    page: typeof body.page === "string" ? body.page.slice(0, 200) : "/",
  };
  if (type === "order") {
    entry.package = ["basic", "monthly", "annual"].includes(body.package)
      ? body.package
      : null;
    entry.referral = body.referral === true;
  }
  log.unshift(entry);
  await store.setJSON(logKey, log.slice(0, 100));

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, totals }),
  };
};
