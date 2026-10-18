import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { stubActiveDrop, stubFrozenItems } from "./support/stubs";

// Live Auth tests are explicit opt-in and pinned to the synthetic test project.
// Never capture passwords, session cookies, or recovery URLs in traces/artifacts.
test.use({ trace: "off", screenshot: "off", video: "off" });
test.describe.configure({ mode: "serial" });
const enabled = process.env.AUTH_E2E === "1";
test.skip(!enabled, "Run AUTH_E2E=1 with test-project credentials to exercise live Auth.");
let db: SupabaseClient;
const password = `Test-${randomUUID()}-Aa9!`;
const users: { id: string; email: string }[] = [];

test.beforeAll(async () => {
  if (!enabled) return;
  process.loadEnvFile(".env.local");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url !== "https://ujpviiulhibzztbricxu.supabase.co") throw new Error("Auth tests require bigmattsbbq-test.");
  db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const role of ["admin", "ordinary"]) {
    const email = `issue45-${role}-${randomUUID()}@example.invalid`;
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error("Synthetic identity provisioning failed.");
    users.push({ id: data.user.id, email });
  }
  const { error } = await db.from("user_roles").insert({ user_id: users[0].id, role_id: "administrator" });
  if (error) throw new Error("Synthetic administrator assignment failed.");
});

test.afterAll(async () => {
  for (const user of users) {
    const { error } = await db.auth.admin.deleteUser(user.id);
    if (error) throw new Error("Synthetic identity cleanup failed.");
  }
});

test("desktop and mobile public login entry preserve active cart", async ({ page }) => {
  await stubFrozenItems(page);
  await stubActiveDrop(page);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Log in", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Cart with/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await page.getByRole("navigation", { name: "Mobile primary" }).getByRole("link", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("anonymous and invalid credentials fail safely", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get("/api/admin/access")).status()).toBe(401);
  await page.getByLabel("Email address").fill(users[0].email);
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.locator("form").getByRole("alert")).toContainText("Unable to log in");
  expect((await page.request.post("/api/auth/logout")).status()).toBe(403);
  const origin = new URL(page.url()).origin;
  expect((await page.request.post("/api/auth/reset-password", { headers: { origin }, data: { password } })).status()).toBe(401);
});

test("administrator login, reload, grant revocation, restoration, logout", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(users[0].email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Admin", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("You’re signed in with administrator access.")).toBeVisible();
  expect((await page.request.get("/api/admin/access")).status()).toBe(200);
  const { error } = await db.from("user_roles").delete().eq("user_id", users[0].id).eq("role_id", "administrator");
  if (error) throw Error("Revocation failed");
  expect((await page.request.get("/api/admin/access")).status()).toBe(403);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
  const grant = await db.from("user_roles").insert({ user_id: users[0].id, role_id: "administrator" });
  if (grant.error) throw Error("Restoration failed");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Admin", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/admin/access")).status()).toBe(401);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("ordinary user cannot access admin or self-escalate through the Data API", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(users[1].email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Access denied" })).toBeVisible();
  expect((await page.request.get("/api/admin/access")).status()).toBe(403);
  await expect(page.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email: users[1].email, password });
  const { error } = await client.from("user_roles").insert({ user_id: users[1].id, role_id: "administrator" });
  expect(error?.code).toBe("42501");
  await client.auth.updateUser({ data: { role: "administrator", permissions: ["admin.access"] } });
  expect((await page.request.get("/api/admin/access")).status()).toBe(403);
  await client.auth.signOut();
});

test("invalid recovery link offers a fresh request without exposing protected content", async ({ page }) => {
  await page.goto("/auth/callback?code=invalid-synthetic-code");
  await expect(page.getByRole("link", { name: "Request a new reset link" })).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toHaveCount(0);
  await page.goto("/reset-password");
  await expect(page.getByRole("link", { name: "Request a new reset link" })).toBeVisible();
});

test("authenticated password update requires re-login and rejects the old password", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(users[0].email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Admin", exact: true })).toBeVisible();
  await page.goto("/reset-password");
  const newPassword = `Changed-${randomUUID()}-Aa9!`;
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Your password has been updated. Log in with your new password.")).toBeVisible();
  expect((await page.request.get("/api/admin/access")).status()).toBe(401);
  const origin = new URL(page.url()).origin;
  const oldLogin = await page.request.post("/api/auth/login", { headers: { origin }, data: { email: users[0].email, password } });
  expect(oldLogin.status()).toBe(400);
  await page.getByLabel("Email address").fill(users[0].email);
  await page.getByLabel("Password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Admin", exact: true })).toBeVisible();
});
