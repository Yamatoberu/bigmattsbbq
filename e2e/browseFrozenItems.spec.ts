import { test, expect } from "@playwright/test";
import { stubFrozenItems, stubActiveDrop } from "./support/stubs";
import { variationIds } from "./fixtures/frozenItems";
import { withSoldOut } from "./fixtures/activeDrop";

test.describe("browse frozen items", () => {
  test("renders in-stock items with prices and add-to-cart", async ({ page }) => {
    await stubActiveDrop(page);
    await stubFrozenItems(page);
    await page.goto("/");

    const brisketCard = page.getByRole("article").filter({
      has: page.getByRole("heading", { name: "Brisket", exact: true })
    });
    const pulledPorkCard = page.getByRole("article").filter({
      has: page.getByRole("heading", { name: "Pulled Pork", exact: true })
    });

    await expect(brisketCard.getByRole("heading", { name: "Brisket", exact: true })).toBeVisible();
    await expect(pulledPorkCard.getByRole("heading", { name: "Pulled Pork", exact: true })).toBeVisible();

    await expect(brisketCard.getByText("$16.99")).toBeVisible();
    await expect(pulledPorkCard.getByText("$13.49")).toBeVisible();

    const brisketAddButton = brisketCard.getByRole("button", { name: "Add to Cart" });
    await expect(brisketAddButton).toBeEnabled();

    await expect(page.getByRole("heading", { name: "Family Night Bundle" })).not.toBeVisible();

    await brisketAddButton.click();

    await expect
      .poll(async () => {
        const raw = await page.evaluate(() => window.localStorage.getItem("big-matts-bbq-cart"));
        return raw ? JSON.parse(raw) : null;
      })
      .toEqual([{ variationId: variationIds.brisket, quantity: 1 }]);
  });

  test("sold-out item swaps add-to-cart for the notify capture", async ({ page }) => {
    await stubActiveDrop(page, withSoldOut({ brisket: true }));
    await stubFrozenItems(page);
    await page.goto("/");

    const brisketCard = page.getByRole("article").filter({
      has: page.getByRole("heading", { name: "Brisket", exact: true })
    });
    const pulledPorkCard = page.getByRole("article").filter({
      has: page.getByRole("heading", { name: "Pulled Pork", exact: true })
    });

    await expect(brisketCard.getByRole("button", { name: "Notify Me" })).toBeVisible();
    await expect(
      brisketCard.getByLabel("Email address for drop notifications")
    ).toBeVisible();
    await expect(brisketCard.getByRole("button", { name: "Add to Cart" })).toHaveCount(0);

    await expect(pulledPorkCard.getByRole("button", { name: "Add to Cart" })).toBeEnabled();
  });
});
