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
