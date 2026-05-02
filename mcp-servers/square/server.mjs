#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

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
const HOST = process.env.SQUARE_HOST ?? "https://connect.squareup.com";
const ENV_LABEL = process.env.SQUARE_ENV ?? "sandbox";
const SQUARE_VERSION = "2024-12-18";

if (!ACCESS_TOKEN) {
  process.stderr.write("square-mcp: SQUARE_ACCESS_TOKEN not set\n");
  process.exit(1);
}

const server = new Server(
  { name: "square-sandbox", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "square_request",
      description: `Make a Square API HTTP request. Connected to: ${ENV_LABEL} (${HOST}). Use standard Square REST paths like /v2/catalog/search-catalog-items.`,
      inputSchema: {
        type: "object",
        properties: {
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE"],
            description: "HTTP method"
          },
          path: {
            type: "string",
            description: "API path, e.g. /v2/locations or /v2/catalog/search-catalog-items"
          },
          body: {
            type: "object",
            description: "Request body (omit for GET requests)"
          },
          requestId: {
            type: "string",
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

  const { method, path, body, requestId } = request.params.arguments;

  const headers = {
    "Authorization": `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "Square-Version": SQUARE_VERSION,
    ...(requestId ? { "X-Request-Id": requestId } : {})
  };

  const response = await fetch(`${HOST}${path}`, {
    method,
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
