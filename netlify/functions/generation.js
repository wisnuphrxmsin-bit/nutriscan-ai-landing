const { connectLambda, getStore } = require("@netlify/blobs");

// GET /.netlify/functions/generation   (also reachable at /api/generation)
// Public, no auth needed — just a counter the front-end uses to detect
// whether the admin has pressed "reset" since this browser's last visit.
exports.handler = async (event) => {
  connectLambda(event);

  const store = getStore("stats");
  const generation = (await store.get("generation", { type: "json" })) || 0;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generation }),
  };
};
