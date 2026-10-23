import { createServer } from "node:http";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { fileURLToPath } from "node:url";

// Isolate configuration tests from developer credentials and local settings.
const localEnvPath = fileURLToPath(new URL("../../../../.env.local", import.meta.url));
const readFileSync = fs.readFileSync;
fs.readFileSync = function (path, ...args) {
  if (path === localEnvPath) throw new Error("Local environment disabled in tests");
  return readFileSync.call(this, path, ...args);
};
syncBuiltinESMExports();

// Loaded only by the test child process. Only redirect probes use native fetch,
// exclusively between ephemeral loopback servers with synthetic credentials.
const nativeFetch = globalThis.fetch;
let redirectProbe;
let redirectHits = 0;
const redirectRequests = [];
let fetchCalls = 0;
async function probeRedirect(options, crossOrigin) {
  if (!redirectProbe) {
    const target = createServer((_request, response) => {
      redirectHits++;
      response.end("{}");
    });
    await new Promise((resolve) => target.listen(0, "127.0.0.1", resolve));
    target.unref();
    const source = createServer((request, response) => {
      if (request.url === "/followed") {
        redirectHits++;
        response.end("{}");
      } else {
        redirectRequests.push(request.headers.authorization);
        response.writeHead(302, {
          Location: request.url === "/cross"
            ? `http://127.0.0.1:${target.address().port}/followed`
            : "/followed"
        });
        response.end();
      }
    });
    await new Promise((resolve) => source.listen(0, "127.0.0.1", resolve));
    source.unref();
    redirectProbe = source;
  }
  return nativeFetch(`http://127.0.0.1:${redirectProbe.address().port}/${crossOrigin ? "cross" : "same"}`, options);
}

globalThis.fetch = async (url, options) => {
  fetchCalls++;
  const destination = new URL(url);
  const expectedOrigin = process.env.SQUARE_ENV === "production"
    ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
  if (destination.origin !== expectedOrigin) {
    throw new Error("Unexpected test destination");
  }

  switch (destination.pathname) {
    case "/v2/test-redirect-same":
    case "/v2/test-redirect-cross":
      return probeRedirect(options, destination.pathname.endsWith("cross"));
    case "/v2/test-redirect-hits":
      return Response.json({ redirectHits, redirectRequests });
    case "/v2/test-fetch-count":
      return Response.json({ fetchCalls });
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
        redirect: options.redirect,
        headers: options.headers,
        body: options.body === undefined ? null : JSON.parse(options.body)
      });
  }
};
