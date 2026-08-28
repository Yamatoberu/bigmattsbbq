#!/usr/bin/env node
// One-command Square order attribution readback: reads a real Square order back
// via RetrieveOrder and prints its attribution_source / attribution_detail
// metadata. Never imported by application code — this script lives only in
// scripts/ and is invoked via `npm run check:attribution -- <orderId>`.
//
// Why this exists: Phase 12 (checkout attribution tracking) writes
// attribution_source / attribution_detail into the Square Order's `metadata`
// map inline on the same POST /v2/orders request that creates the order.
// That metadata is private to this application and does NOT appear in the
// Square Seller Dashboard order view, so the only way to confirm Square
// actually persisted and returns it is to call RetrieveOrder directly. See
// 12-RESEARCH.md Pitfall 3.

// Must stay in sync with SQUARE_VERSION in lib/square.ts.
const SQUARE_VERSION = "2026-04-21";

function printUsage() {
  console.error("Usage: npm run check:attribution -- <orderId>");
}

async function main() {
  const orderId = process.argv[2];

  if (!orderId) {
    printUsage();
    process.exit(1);
    return;
  }

  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const host = process.env.SQUARE_HOST || "https://connect.squareup.com";

  if (!accessToken) {
    console.error(
      "Missing SQUARE_ACCESS_TOKEN. Set it in .env.local before running this script."
    );
    process.exit(1);
    return;
  }

  let response;
  try {
    response = await fetch(`${host}/v2/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Square-Version": SQUARE_VERSION,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error(`Network error while reaching Square (${host}):`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
    return;
  }

  const bodyText = await response.text();

  if (!response.ok) {
    console.error(`FAIL: HTTP ${response.status} retrieving order ${orderId}`);
    console.error(bodyText.slice(0, 500));
    process.exit(1);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    console.error("FAIL: Square returned a non-JSON response.");
    console.error(bodyText.slice(0, 500));
    process.exit(1);
    return;
  }

  const metadata = parsed?.order?.metadata ?? {};
  const attributionSource = metadata.attribution_source;
  const attributionDetail = metadata.attribution_detail;

  if (!attributionSource) {
    console.log(`NO ATTRIBUTION: order ${orderId} carries no attribution_source metadata.`);
    console.log(
      "Reminder: this metadata is private to this application and will NOT appear in the Square Seller Dashboard."
    );
    process.exit(0);
    return;
  }

  console.log(`PASS: order ${orderId} carries attribution metadata.`);
  console.log(`attribution_source=${attributionSource}`);
  if (attributionDetail) {
    console.log(`attribution_detail=${attributionDetail}`);
  }
  console.log(
    "Reminder: this metadata is private to this application and will NOT appear in the Square Seller Dashboard."
  );
  process.exit(0);
}

main();
