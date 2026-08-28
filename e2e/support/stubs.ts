import { APIRequestContext, Page } from "@playwright/test";
import { CheckoutResponseBody, DropDTO, FrozenItemDTO, CartItem, AttributionSourceDTO } from "../../lib/types";
import { frozenItemsFixture } from "../fixtures/frozenItems";
import { activeDropFixture } from "../fixtures/activeDrop";
import { attributionSourcesFixture } from "../fixtures/attributionSources";

const CART_STORAGE_KEY = "big-matts-bbq-cart";

export async function stubFrozenItems(
  page: Page,
  items: FrozenItemDTO[] = frozenItemsFixture
): Promise<void> {
  await page.route("**/api/frozen-items", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(items)
    })
  );
}

export async function stubActiveDrop(
  page: Page,
  drop: DropDTO = activeDropFixture
): Promise<void> {
  await page.route("**/api/drop", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(drop)
    })
  );
}

export async function stubAttributionSources(
  page: Page,
  sources: AttributionSourceDTO[] = attributionSourcesFixture
): Promise<void> {
  await page.route("**/api/attribution-sources", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(sources)
    })
  );
}

export interface CheckoutStubHandle {
  getRequestBody: () => unknown;
}

export async function stubCheckout(
  page: Page,
  response: CheckoutResponseBody
): Promise<CheckoutStubHandle> {
  let capturedBody: unknown;

  await page.route("**/api/checkout", (route) => {
    capturedBody = route.request().postDataJSON();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response)
    });
  });

  return {
    getRequestBody: () => capturedBody
  };
}

export async function seedCart(page: Page, items: CartItem[]): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
    },
    [CART_STORAGE_KEY, JSON.stringify(items)]
  );
}

export async function hasActiveDrop(request: APIRequestContext): Promise<boolean> {
  const response = await request.get("/api/drop");
  if (!response.ok()) {
    return false;
  }
  const body = await response.json().catch(() => null);
  return Boolean(
    body && typeof body === "object" && (body as { status?: unknown }).status === "active"
  );
}
