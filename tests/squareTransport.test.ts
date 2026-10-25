import { createServer, type Server, type RequestListener } from "node:http";
import { once } from "node:events";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrder, searchCatalogItems } from "../lib/square";

const run = promisify(execFile);
const nativeFetch = globalThis.fetch;
const servers: Server[] = [];

async function listen(handler: RequestListener) {
  const server = createServer(handler);
  servers.push(server);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No loopback port");
  return `http://127.0.0.1:${address.port}`;
}

function scriptEnv(settings: Record<string, string | undefined> = {}) {
  // No inherited application credentials or .env file loading.
  return { NODE_ENV: "test" as const, SQUARE_ENV: "sandbox", SQUARE_ACCESS_TOKEN: "synthetic-token", ...settings };
}

function preload(source: string) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve());
    server.closeAllConnections();
  })));
});

describe("Square request transport", () => {
  it.each([301, 302, 303, 307, 308].flatMap((status) =>
    [false, true].map((sameOrigin) => ({ status, sameOrigin }))
  ))("does not follow $status (sameOrigin=$sameOrigin) or replay credentials/body", async ({ status, sameOrigin }) => {
    let targetCalls = 0;
    let initialCalls = 0;
    const target = await listen((_req, res) => {
      targetCalls++;
      res.end('{}');
    });
    const initial = await listen((req, res) => {
      if (req.url === "/redirect-target") { targetCalls++; res.end('{}'); return; }
      initialCalls++;
      expect(req.headers.authorization).toBe("Bearer synthetic-token");
      res.writeHead(status, { Location: sameOrigin ? "/redirect-target" : `${target}/redirect-target` });
      res.end();
    });
    // Only reroute the initial request to loopback; the actual native fetch
    // implementation decides whether it follows the redirect.
    vi.stubGlobal("fetch", vi.fn((_url, options) => nativeFetch(initial, options)));
    await expect(searchCatalogItems({
      host: "https://connect.squareupsandbox.com", accessToken: "synthetic-token", categoryId: "category"
    })).rejects.toThrow();
    expect(initialCalls).toBe(1);
    expect(targetCalls).toBe(0);
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: "error" }));
  });

  it("preserves successful order requests", async () => {
    const mock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ order: { id: "order-1" } })));
    vi.stubGlobal("fetch", mock);
    const result = await createOrder({
      host: "https://connect.squareupsandbox.com", accessToken: "synthetic-token",
      body: {}, idempotencyKey: "attempt-1", requestId: "request-1"
    });
    expect(result).toEqual({ order: { id: "order-1" } });
    expect(mock).toHaveBeenCalledWith("https://connect.squareupsandbox.com/v2/orders", expect.objectContaining({
      method: "POST", redirect: "error", body: JSON.stringify({ idempotency_key: "attempt-1" }),
      headers: expect.objectContaining({ Authorization: "Bearer synthetic-token", "X-Request-Id": "request-1" })
    }));
  });
});

describe("attribution CLI", () => {
  it.each([
    { SQUARE_ENV: undefined }, { SQUARE_ENV: "invalid" },
    { SQUARE_HOST: "https://connect.squareup.com" }, { SQUARE_HOST: "https://proxy.example" }
  ])("rejects %j before fetch", async (settings) => {
    const result = await run(process.execPath, ["--import", preload(`
      globalThis.fetch = () => { console.error('UNEXPECTED_FETCH'); process.exit(99); };
    `), "scripts/check-order-attribution.mjs", "synthetic-order"], {
      env: scriptEnv(settings)
    }).catch((error) => error);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/SQUARE_ENV must|SQUARE_HOST must/);
    expect(result.stderr).not.toContain("UNEXPECTED_FETCH");
  });

  it.each(["sandbox", "production"])("preserves valid %s readback", async (environment) => {
    const origin = environment === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
    const result = await run(process.execPath, ["--import", preload(`
      import assert from 'node:assert/strict';
      globalThis.fetch = async (url, options) => {
        assert.equal(url, ${JSON.stringify(origin + "/v2/orders/order%2Fid")});
        assert.equal(options.redirect, 'error');
        assert.equal(options.headers.Authorization, 'Bearer synthetic-token');
        return new Response(JSON.stringify({order:{metadata:{attribution_source:'test'}}}));
      };
    `), "scripts/check-order-attribution.mjs", "order/id"], { env: scriptEnv({ SQUARE_ENV: environment }) });
    expect(result.stdout).toContain("PASS:");
  });

  it.each([302, 307, 308])("does not follow a GET %s redirect", async (status) => {
    let targetCalls = 0;
    let initialCalls = 0;
    const target = await listen((_req, res) => { targetCalls++; res.end('{}'); });
    const initial = await listen((req, res) => {
      initialCalls++;
      expect(req.headers.authorization).toBe("Bearer synthetic-token");
      res.writeHead(status, { Location: target }); res.end();
    });
    const result = await run(process.execPath, ["--import", preload(`
      const nativeFetch = globalThis.fetch;
      globalThis.fetch = (_url, options) => nativeFetch(${JSON.stringify(initial)}, options);
    `), "scripts/check-order-attribution.mjs", "synthetic-order"], { env: scriptEnv() }).catch((error) => error);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Network error while reaching Square");
    expect(initialCalls).toBe(1);
    expect(targetCalls).toBe(0);
  });
});
