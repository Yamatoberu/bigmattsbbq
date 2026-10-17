import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

// Deliberately do not fall back to application/production credentials.
const url = process.env.TEST_SUPABASE_URL;
const key = process.env.TEST_SUPABASE_ANON_KEY;
assert.equal(
  url,
  "https://ujpviiulhibzztbricxu.supabase.co",
  "TEST_SUPABASE_URL must target bigmattsbbq-test",
);
assert.ok(key, "TEST_SUPABASE_ANON_KEY is required");

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Real, bounded SQL reads through the Data API using public RLS policies.
// Empty tables are valid: fixtures may change during development.
for (const [table, columns] of [
  ["drops", "id,status"],
  ["drop_pickup_options", "id,drop_id"],
  ["attribution_sources", "code,is_active"],
]) {
  test(`test database can read ${table}`, { timeout: 25_000 }, async () => {
    const { data, error, status } = await client
      .from(table)
      .select(columns)
      .limit(1)
      .abortSignal(AbortSignal.timeout(20_000));

    // Do not log provider errors, credentials, or returned row contents.
    assert.ok(!error, `${table} query failed (HTTP ${status})`);
    assert.ok(Array.isArray(data), `${table} must return an array`);
    for (const row of data) {
      for (const column of columns.split(",")) {
        assert.ok(Object.hasOwn(row, column), `${table} missing ${column}`);
      }
    }
  });
}
