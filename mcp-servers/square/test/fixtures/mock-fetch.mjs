// Loaded only by the test child process. Never delegate to the real network.
globalThis.fetch = async (url, options) => {
  const destination = new URL(url);
  if (destination.origin !== "https://connect.squareupsandbox.com") {
    throw new Error("Unexpected test destination");
  }

  switch (destination.pathname) {
    case "/v2/test-error":
      return Response.json({ errors: [{ code: "UNAUTHORIZED" }] }, { status: 401 });
    case "/v2/test-non-json":
      return new Response("Service unavailable", { status: 503 });
    case "/v2/test-network-error":
      throw new Error("Synthetic network failure");
    default:
      return Response.json({
        url,
        method: options.method,
        headers: options.headers,
        body: options.body === undefined ? null : JSON.parse(options.body)
      });
  }
};
