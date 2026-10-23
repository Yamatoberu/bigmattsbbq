#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getSquareOrigin, validateRequest } from "./request-policy.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local from project root without overwriting existing env vars
function loadEnvLocal() {
  try {
    const content = readFileSync(join(__dirname, "../../.env.local"), "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // fall through — rely on process.env
  }
}

loadEnvLocal();

const ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const ENV_LABEL = process.env.SQUARE_ENV;
let HOST;
const SQUARE_VERSION = "2024-12-18";

if (!ACCESS_TOKEN) {
  process.stderr.write("square-mcp: SQUARE_ACCESS_TOKEN not set\n");
  process.exit(1);
}

try {
  HOST = getSquareOrigin(ENV_LABEL, process.env.SQUARE_HOST);
} catch (error) {
  process.stderr.write(`square-mcp: ${error.message}\n`);
  process.exit(1);
}

const server = new Server(
  { name: `square-${ENV_LABEL}`, version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "square_request",
      description: `Make a Square API HTTP request. Connected to: ${ENV_LABEL} (${HOST}). Use standard Square REST paths like /v2/catalog/search-catalog-items.`,
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE"],
            description: "HTTP method"
          },
          path: {
            type: "string",
            description: "Rooted /v2/ API path, optionally with a query string; no URLs, traversal, or fragments"
          },
          body: {
            type: "object",
            description: "Request body (omit for GET requests)"
          },
          requestId: {
            type: "string",
            minLength: 1,
            maxLength: 128,
            description: "Optional X-Request-Id header for tracing"
          }
        },
        required: ["method", "path"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "square_request") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { method, url, body, requestId } = validateRequest(request.params.arguments, HOST);

  const headers = {
    "Authorization": `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "Square-Version": SQUARE_VERSION,
    ...(requestId ? { "X-Request-Id": requestId } : {})
  };

  const response = await fetch(url, {
    method,
    redirect: "error",
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ status: response.status, ok: response.ok, data }, null, 2)
      }
    ],
    isError: !response.ok
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
