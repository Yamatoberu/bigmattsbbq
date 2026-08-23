#!/usr/bin/env node
// One-command preflight check: verifies the Supabase `sca` schema is reachable
// via PostgREST using the service-role key. Never imported by application code —
// this script lives only in scripts/ and is invoked via `npm run check:sca`.
//
// Why this exists: Supabase's PostgREST layer refuses to route requests to any
// schema that isn't in the dashboard's "Exposed schemas" allowlist. The
// service-role key bypasses Row Level Security but NOT this routing-level
// allowlist, so even a fully-privileged key gets PGRST106 until the schema is
// explicitly exposed. See 09-RESEARCH.md Pitfall 1.

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function printRemediation() {
  console.error("");
  console.error("The sca schema is NOT exposed to PostgREST (PGRST106).");
  console.error("");
  console.error("To fix:");
  console.error("  1. Open the Supabase dashboard for project wpziabhigztyjrmjpmbw");
  console.error('  2. Go to Project Settings -> Data API -> "Exposed schemas"');
  console.error('  3. Add "sca" to the list');
  console.error("  4. Save");
  console.error("  5. Re-run: npm run check:sca");
  console.error("");
}

async function main() {
  if (!url || !key) {
    console.error(
      "Missing Supabase environment variables. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
    process.exit(1);
    return;
  }

  let host;
  try {
    host = new URL(url).host;
  } catch {
    host = "(unparseable URL)";
  }

  let response;
  try {
    response = await fetch(`${url}/rest/v1/`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Accept-Profile": "sca"
      }
    });
  } catch (err) {
    console.error(`Network error while reaching Supabase (${host}):`);
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
    return;
  }

  const bodyText = await response.text();

  if (response.ok) {
    console.log(`PASS: sca schema is reachable at ${host}.`);
    process.exit(0);
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = undefined;
  }

  const isPgrst106 = parsed?.code === "PGRST106" || bodyText.includes("PGRST106");

  if (isPgrst106) {
    console.error(`FAIL: PGRST106 — sca schema is NOT exposed (checked ${host}).`);
    printRemediation();
    process.exit(1);
    return;
  }

  console.error(`FAIL: Unexpected response from Supabase (${host}). HTTP ${response.status}`);
  console.error(bodyText.slice(0, 500));
  process.exit(1);
}

main();
