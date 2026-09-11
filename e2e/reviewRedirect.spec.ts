import { test, expect } from "@playwright/test";

test.describe("review redirect", () => {
  test("/review redirects to the Google review form", async ({ request }) => {
    const response = await request.get("/review", { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe("https://g.page/r/CeLcycUsx16aEAI/review");
  });

  test("a browser navigating to /review lands on the Google review URL", async ({ page, context }) => {
    const destinationUrl = "https://g.page/r/CeLcycUsx16aEAI/review";
    const stubBody = "<html><body>stubbed google review page</body></html>";

    const client = await context.newCDPSession(page);
    await client.send("Fetch.enable", {
      patterns: [{ urlPattern: destinationUrl, requestStage: "Request" }]
    });
    client.on("Fetch.requestPaused", (event) => {
      void client.send("Fetch.fulfillRequest", {
        requestId: event.requestId,
        responseCode: 200,
        responseHeaders: [{ name: "content-type", value: "text/html" }],
        body: Buffer.from(stubBody).toString("base64")
      });
    });

    await page.goto("/review");

    expect(page.url()).toBe(destinationUrl);
    await expect(page.locator("body")).toContainText("stubbed google review page");
  });
});
