import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverPath = fileURLToPath(new URL("../server.mjs", import.meta.url));
const mockFetchPath = fileURLToPath(new URL("./fixtures/mock-fetch.mjs", import.meta.url));
const testEnv = {
  SQUARE_ACCESS_TOKEN: "synthetic-test-token",
  SQUARE_ENV: "sandbox",
  SQUARE_HOST: "https://connect.squareupsandbox.com"
};

test("stdio initialization, tool discovery, requests and errors", { timeout: 15000 }, async (t) => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", mockFetchPath, serverPath],
    env: testEnv,
    stderr: "pipe"
  });
  const client = new Client({ name: "square-regression-test", version: "1.0.0" });
  t.after(() => client.close());
  await client.connect(transport);

  await t.test("initializes and lists the Square tool", async () => {
    assert.equal(client.getServerVersion().name, "square-sandbox");
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(({ name }) => name), ["square_request"]);
    assert.deepEqual(tools[0].inputSchema.required, ["method", "path"]);
    assert.match(tools[0].description, /sandbox \(https:\/\/connect\.squareupsandbox\.com\)/);
  });

  for (const method of ["GET", "POST", "PUT", "DELETE"]) {
    await t.test(`forwards a ${method} request and returns its response`, async () => {
      const body = method === "GET" ? undefined : { synthetic: true };
      const result = await client.callTool({
        name: "square_request",
        arguments: {
          method,
          path: "/v2/locations?cursor=synthetic",
          requestId: "test-request-id",
          ...(body ? { body } : {})
        }
      });
      assert.equal(result.isError, false);
      const response = JSON.parse(result.content[0].text);
      assert.equal(response.status, 200);
      assert.equal(response.ok, true);
      assert.equal(response.data.url, `${testEnv.SQUARE_HOST}/v2/locations?cursor=synthetic`);
      assert.equal(response.data.method, method);
      assert.equal(response.data.redirect, "error");
      assert.equal(response.data.headers.Authorization, "Bearer synthetic-test-token");
      assert.equal(response.data.headers["Content-Type"], "application/json");
      assert.match(response.data.headers["Square-Version"], /^\d{4}-\d{2}-\d{2}$/);
      assert.equal(response.data.headers["X-Request-Id"], "test-request-id");
      assert.deepEqual(response.data.body, body ?? null);
    });
  }

  await t.test("surfaces provider errors as tool errors", async () => {
    const result = await client.callTool({
      name: "square_request",
      arguments: { method: "GET", path: "/v2/test-error" }
    });
    assert.equal(result.isError, true);
    assert.deepEqual(JSON.parse(result.content[0].text), {
      status: 401,
      ok: false,
      data: { errors: [{ code: "UNAUTHORIZED" }] }
    });
  });

  await t.test("accepts a request ID at the 128-character limit", async () => {
    const requestId = "a".repeat(128);
    const result = await client.callTool({
      name: "square_request", arguments: { method: "GET", path: "/v2/locations", requestId }
    });
    assert.equal(result.isError, false);
    assert.equal(JSON.parse(result.content[0].text).data.headers["X-Request-Id"], requestId);
  });

  await t.test("omits the tracing header when request ID is absent", async () => {
    const result = await client.callTool({
      name: "square_request", arguments: { method: "GET", path: "/v2/locations" }
    });
    assert.equal(result.isError, false);
    assert.equal(Object.hasOwn(JSON.parse(result.content[0].text).data.headers, "X-Request-Id"), false);
  });

  await t.test("supports POST without a body", async () => {
    const result = await client.callTool({
      name: "square_request", arguments: { method: "POST", path: "/v2/locations" }
    });
    assert.equal(result.isError, false);
    const data = JSON.parse(result.content[0].text).data;
    assert.equal(data.method, "POST");
    assert.equal(data.body, null);
  });

  await t.test("handles a non-JSON provider error", async () => {
    const result = await client.callTool({
      name: "square_request",
      arguments: { method: "GET", path: "/v2/test-non-json" }
    });
    assert.equal(result.isError, true);
    assert.deepEqual(JSON.parse(result.content[0].text), { status: 503, ok: false, data: {} });
  });

  await t.test("reports transport failures and remains responsive", async () => {
    await assert.rejects(client.callTool({
      name: "square_request",
      arguments: { method: "GET", path: "/v2/test-network-error" }
    }), /Synthetic network failure/);
    assert.equal((await client.listTools()).tools.length, 1);
  });

  await t.test("rejects an unknown tool", async () => {
    await assert.rejects(client.callTool({ name: "unknown", arguments: {} }), /Unknown tool/);
  });

  await t.test("rejects unsafe paths before fetch", async () => {
    const before = await client.callTool({
      name: "square_request", arguments: { method: "GET", path: "/v2/test-fetch-count" }
    });
    const count = JSON.parse(before.content[0].text).data.fetchCalls;
    for (const path of [
      ".example.invalid/v2/locations", "https://example.invalid/v2/locations",
      "//example.invalid/v2/locations", "//user:pass@example.invalid/v2/locations",
      "/v2/\\example.invalid", "/v2/locations#fragment", "/v2/../locations",
      "/v2/%2e%2e/locations", "/v2/%2E./locations", "/v2/%2e%2e%2flocations",
      "/v2/locations%", "/v2/%zz", "/v2/%ff", "/v2/%00", "/v2/%5c",
      "/v2/locations?cursor=%zz", "/v2/loc\nations", "/v2/ locations", "/v1/locations", ""
    ]) {
      await assert.rejects(client.callTool({
        name: "square_request", arguments: { method: "GET", path }
      }), /Path must|Unsafe API path|URI malformed/, path);
    }
    const after = await client.callTool({
      name: "square_request", arguments: { method: "GET", path: "/v2/test-fetch-count" }
    });
    assert.equal(JSON.parse(after.content[0].text).data.fetchCalls, count + 1);
  });

  await t.test("rejects malformed runtime arguments before fetch", async () => {
    const before = await client.callTool({
      name: "square_request", arguments: { method: "GET", path: "/v2/test-fetch-count" }
    });
    const count = JSON.parse(before.content[0].text).data.fetchCalls;
    await assert.rejects(client.callTool({ name: "square_request" }), /Request arguments must/);
    for (const [args, message] of [
      [{}, /Unsupported HTTP method/],
      [{ method: "PATCH", path: "/v2/locations" }, /Unsupported HTTP method/],
      [{ method: "GET", path: 42 }, /Path must/],
      [{ method: "GET", path: "/v2/locations", body: {} }, /GET requests/],
      ...[null, [], "body", 42].map((body) => [
        { method: "POST", path: "/v2/locations", body }, /body must be an object/
      ]),
      ...[42, "", "a\r\nb", "é", "a".repeat(129)].map((requestId) => [
        { method: "GET", path: "/v2/locations", requestId }, /requestId must/
      ]),
      [{ method: "GET", path: "/v2/locations", host: "https://example.invalid" }, /Unknown request argument/]
    ]) {
      await assert.rejects(client.callTool({ name: "square_request", arguments: args }), message);
    }
    const after = await client.callTool({
      name: "square_request", arguments: { method: "GET", path: "/v2/test-fetch-count" }
    });
    assert.equal(JSON.parse(after.content[0].text).data.fetchCalls, count + 1);
  });

  await t.test("rejects real same-origin and cross-origin redirects without a second request", async () => {
    for (const kind of ["same", "cross"]) {
      await assert.rejects(client.callTool({
        name: "square_request", arguments: { method: "GET", path: `/v2/test-redirect-${kind}` }
      }), /fetch failed/);
    }
    const result = await client.callTool({
      name: "square_request", arguments: { method: "GET", path: "/v2/test-redirect-hits" }
    });
    assert.deepEqual(JSON.parse(result.content[0].text).data, {
      redirectHits: 0,
      redirectRequests: ["same", "cross"].map(() => ({
        authorization: "Bearer synthetic-test-token", method: "GET", body: null
      }))
    });
  });

  for (const status of [307, 308]) {
    for (const kind of ["same", "cross"]) {
      await t.test(`rejects POST ${status} ${kind}-origin redirect without forwarding credentials or body`, async () => {
        const body = { synthetic: true, idempotency_key: `test-${status}-${kind}` };
        const before = await client.callTool({
          name: "square_request", arguments: { method: "GET", path: "/v2/test-redirect-hits" }
        });
        const prior = JSON.parse(before.content[0].text).data;
        await assert.rejects(client.callTool({
          name: "square_request",
          arguments: { method: "POST", path: `/v2/test-redirect-${kind}-${status}`, body }
        }), /fetch failed/);
        const after = await client.callTool({
          name: "square_request", arguments: { method: "GET", path: "/v2/test-redirect-hits" }
        });
        assert.deepEqual(JSON.parse(after.content[0].text).data, {
          redirectHits: 0,
          redirectRequests: [...prior.redirectRequests, {
            authorization: "Bearer synthetic-test-token", method: "POST", body
          }]
        });
      });
    }
  }
});

const syntheticEnvLocal = [
  "# Synthetic configuration only; never read the developer environment file",
  "SQUARE_ACCESS_TOKEN=synthetic-file-token",
  "SQUARE_ENV=sandbox",
  "SQUARE_HOST=https://connect.squareupsandbox.com"
].join("\n");

for (const overrideProcess of [false, true]) {
  test(`loads synthetic .env.local settings${overrideProcess ? " with process environment taking precedence" : " when process settings are absent"}`, async (t) => {
    const env = { TEST_SQUARE_ENV_LOCAL: syntheticEnvLocal };
    if (overrideProcess) Object.assign(env, {
      SQUARE_ACCESS_TOKEN: "synthetic-process-token",
      SQUARE_ENV: "production",
      SQUARE_HOST: "https://connect.squareup.com"
    });
    const transport = new StdioClientTransport({
      command: process.execPath, args: ["--import", mockFetchPath, serverPath], env, stderr: "pipe"
    });
    const client = new Client({ name: "square-config-test", version: "1.0.0" });
    t.after(() => client.close());
    await client.connect(transport);
    assert.equal(client.getServerVersion().name, overrideProcess ? "square-production" : "square-sandbox");
    const result = await client.callTool({
      name: "square_request", arguments: { method: "GET", path: "/v2/locations" }
    });
    assert.equal(result.isError, false);
    const data = JSON.parse(result.content[0].text).data;
    assert.equal(data.url, `${overrideProcess ? "https://connect.squareup.com" : testEnv.SQUARE_HOST}/v2/locations`);
    assert.equal(data.headers.Authorization, `Bearer synthetic-${overrideProcess ? "process" : "file"}-token`);
  });
}

test("rejects a stale .env.local host that conflicts with the process environment", () => {
  const result = spawnSync(process.execPath, ["--import", mockFetchPath, serverPath], {
    env: { TEST_SQUARE_ENV_LOCAL: syntheticEnvLocal, SQUARE_ENV: "production" },
    encoding: "utf8", timeout: 5000
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SQUARE_HOST must exactly match/);
  assert.doesNotMatch(result.stderr, /synthetic-file-token/);
  assert.equal(result.stdout, "");
});

for (const environment of ["sandbox", "production"]) {
  const origin = environment === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
  for (const host of [undefined, origin]) {
    test(`uses the ${environment} origin with ${host ? "explicit" : "derived"} host and preserves encoded IDs and queries`, async (t) => {
      const transport = new StdioClientTransport({
        command: process.execPath, args: ["--import", mockFetchPath, serverPath],
        env: { ...testEnv, SQUARE_ENV: environment, SQUARE_HOST: host }, stderr: "pipe"
      });
      const client = new Client({ name: "square-policy-test", version: "1.0.0" });
      t.after(() => client.close());
      await client.connect(transport);
      assert.equal(client.getServerVersion().name, `square-${environment}`);
      const path = "/v2/catalog/object/a%2Fb?cursor=a%2Bb%3D&limit=10";
      const result = await client.callTool({ name: "square_request", arguments: { method: "GET", path } });
      const data = JSON.parse(result.content[0].text).data;
      assert.equal(data.url, origin + path);
      assert.equal(data.headers.Authorization, "Bearer synthetic-test-token");
    });
  }
}

test("rejects invalid environment and host configuration at startup", () => {
  for (const override of [
    { SQUARE_ENV: undefined }, { SQUARE_ENV: "" }, { SQUARE_ENV: "staging" }, { SQUARE_ENV: "production" },
    ...["", "https://connect.squareup.com", "https://example.invalid", "https://connect.squareupsandbox.com.example.invalid",
      "http://connect.squareupsandbox.com", "https://connect.squareupsandbox.com:443",
      "https://user:pass@connect.squareupsandbox.com", "https://connect.squareupsandbox.com/",
      "https://connect.squareupsandbox.com/v2", "https://connect.squareupsandbox.com?x=1",
      "https://connect.squareupsandbox.com#fragment"].map((SQUARE_HOST) => ({ SQUARE_HOST }))
  ]) {
    const result = spawnSync(process.execPath, ["--import", mockFetchPath, serverPath], {
      env: { ...testEnv, ...override }, encoding: "utf8", timeout: 5000
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /SQUARE_ENV must|SQUARE_HOST must/);
    assert.equal(result.stdout, "");
    assert.doesNotMatch(result.stderr, /synthetic-test-token/);
  }
});

test("exits with a diagnostic when the access token is missing", () => {
  const result = spawnSync(process.execPath, ["--import", mockFetchPath, serverPath], {
    env: { ...testEnv, SQUARE_ACCESS_TOKEN: "" },
    encoding: "utf8",
    timeout: 5000
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /SQUARE_ACCESS_TOKEN not set/);
  assert.equal(result.stdout, "");
});
