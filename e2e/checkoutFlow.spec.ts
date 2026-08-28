import { test, expect, Page } from "@playwright/test";
import { stubFrozenItems, stubCheckout, seedCart, hasActiveDrop } from "./support/stubs";
import { variationIds } from "./fixtures/frozenItems";

async function ensurePickupOptionSelected(page: Page) {
  const pressedButtons = page.locator("button[aria-pressed='true']");
  if ((await pressedButtons.count()) > 0) {
    return;
  }
  await page.locator("button[aria-pressed='false']:not([disabled])").first().click();
}

test.describe("checkout flow", () => {
  test.beforeEach(async ({ request }) => {
    const active = await hasActiveDrop(request);
    test.skip(
      !active,
      "/checkout server-renders fetchActiveDrop() and redirects to / without a real active drop in Supabase, so this suite needs one to exist."
    );
  });

  test("sauce bump prompts when the cart has meat and no sauce", async ({ page }) => {
    await stubFrozenItems(page);
    await seedCart(page, [{ variationId: variationIds.brisket, quantity: 1 }]);
    await stubCheckout(page, { orderId: "unused", invoiceId: "unused", pickupNote: "unused" });

    await page.goto("/checkout");

    const bumpHeading = page.getByRole("heading", { name: /don.?t forget the sauce/i });
    await expect(bumpHeading).toBeVisible();

    await page.getByRole("button", { name: "Add Sauce" }).click();

    await expect(page.getByText("House BBQ Sauce")).toBeVisible();
    await expect(bumpHeading).not.toBeVisible();
  });

  test("submitting checkout posts a valid body and reaches confirmation", async ({ page }) => {
    await stubFrozenItems(page);
    await seedCart(page, [
      { variationId: variationIds.brisket, quantity: 1 },
      { variationId: variationIds.sauce, quantity: 1 }
    ]);

    const checkoutHandle = await stubCheckout(page, {
      orderId: "order-e2e-12345",
      invoiceId: "invoice-e2e-99999",
      pickupNote: "Pickup Saturday at Preston, 10am-2pm"
    });

    await page.goto("/checkout");

    await expect(page.getByRole("heading", { name: /don.?t forget the sauce/i })).not.toBeVisible();

    await ensurePickupOptionSelected(page);

    const testEmail = "e2e-checkout@example.com";
    await page.getByLabel("First name").fill("Ember");
    await page.getByLabel("Last name").fill("Tester");
    await page.getByLabel("Email").fill(testEmail);

    await page.getByRole("button", { name: "Submit Order" }).click();

    await expect(page).toHaveURL(/\/confirmation/);
    await expect(page.getByText("order-e2e-12345")).toBeVisible();
    await expect(page.getByText("Pickup Saturday at Preston, 10am-2pm")).toBeVisible();

    await expect
      .poll(async () => {
        const raw = await page.evaluate(() => window.localStorage.getItem("big-matts-bbq-cart"));
        return raw ? JSON.parse(raw) : null;
      })
      .toEqual([]);

    const body = checkoutHandle.getRequestBody() as {
      dropId: string;
      pickupOptionId: string;
      customer: { email: string };
      cart: Array<{ variationId: string; quantity: number }>;
    };

    expect(typeof body.dropId).toBe("string");
    expect(body.dropId.length).toBeGreaterThan(0);
    expect(typeof body.pickupOptionId).toBe("string");
    expect(body.pickupOptionId.length).toBeGreaterThan(0);
    expect(body.customer.email).toBe(testEmail);
    expect(Array.isArray(body.cart)).toBe(true);
    for (const entry of body.cart) {
      expect(typeof entry.variationId).toBe("string");
      expect(Number.isInteger(entry.quantity)).toBe(true);
      expect(entry.quantity).toBeGreaterThan(0);
    }
  });
});
