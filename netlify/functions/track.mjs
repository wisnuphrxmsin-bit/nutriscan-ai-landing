const { connectLambda, getStore } = require("@netlify/blobs");

function bangkokDateString(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

exports.handler = async (event) => {
  connectLambda(event);

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    body = {};
  }

  const type = body.type;
  if (type !== "visit" && type !== "order") {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid type" }) };
  }

  const store = getStore("stats");
  const field = type === "visit" ? "visits" : "orders";

  const totalsKey = "totals";
  const totals = (await store.get(totalsKey, { type: "json" })) || {
    visits: 0,
    orders: 0,
    packages: { basic: 0, monthly: 0, annual: 0 },
    referralUses: 0,
  };
  if (!totals.packages) totals.packages = { basic: 0, monthly: 0, annual: 0 };
  if (typeof totals.referralUses !== "number") totals.referralUses = 0;

  totals[field] += 1;

  if (type === "order") {
    if (["basic", "monthly", "annual"].includes(body.package)) {
      totals.packages[body.package] += 1;
    }
    if (body.referral === true) {
      totals.referralUses += 1;
    }
  }
  await store.setJSON(totalsKey, totals);

  const today = bangkokDateString();
  const dailyKey = "daily:" + today;
