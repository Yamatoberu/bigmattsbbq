import { test, expect } from "@playwright/test";

test.describe("review redirect", () => {
  test("/review redirects to the Google review form", async ({ request }) => {
    const response = await request.get("/review", { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe("https://g.page/r/CeLcycUsx16aEAI/review");
  });
});
