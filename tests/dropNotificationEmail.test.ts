import { createElement } from "react";
import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { DropNotificationEmail } from "../emails/DropNotificationEmail";

describe("DropNotificationEmail real render", () => {
  it("preserves {{{RESEND_UNSUBSCRIBE_URL}}} through actual rendering", async () => {
    const html = await render(
      createElement(DropNotificationEmail, { subject: "Drop is live", dropId: "d1" })
    );
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
  });

  it("includes dropId in order URL when provided", async () => {
    const html = await render(
      createElement(DropNotificationEmail, { subject: "Drop", dropId: "spring-24" })
    );
    expect(html).toContain("drop=spring-24");
  });

  it("falls back to base URL when dropId is omitted", async () => {
    const html = await render(
      createElement(DropNotificationEmail, { subject: "Drop" })
    );
    expect(html).toContain("https://bigmattsbbq.com");
    expect(html).not.toContain("drop=");
  });
});
