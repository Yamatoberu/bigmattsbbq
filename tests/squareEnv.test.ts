import { afterEach, describe, expect, it, vi } from "vitest";
import { getSquareEnv } from "../lib/env";

const invalidSquareSettings = [
  { SQUARE_ENV: undefined }, { SQUARE_ENV: "" }, { SQUARE_ENV: "staging" },
  { SQUARE_ENV: "Sandbox" }, { SQUARE_ENV: " sandbox" },
  ...[
    "", "https://connect.squareup.com", "http://connect.squareupsandbox.com",
    "https://connect.squareupsandbox.com/", "https://connect.squareupsandbox.com:443",
    "https://connect.squareupsandbox.com.evil.example", "https://user@connect.squareupsandbox.com",
    "https://connect.squareupsandbox.com/path", "https://connect.squareupsandbox.com?query",
    "https://connect.squareupsandbox.com#fragment", " https://connect.squareupsandbox.com",
    "https://CONNECT.squareupsandbox.com"
  ].map((SQUARE_HOST) => ({ SQUARE_ENV: "sandbox", SQUARE_HOST })),
  { SQUARE_ENV: "production", SQUARE_HOST: "https://connect.squareupsandbox.com" }
];

function configure(settings: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries({
    SQUARE_ENV: "sandbox", SQUARE_HOST: undefined,
    SQUARE_ACCESS_TOKEN: "synthetic-token", SQUARE_LOCATION_ID: "location",
    SQUARE_FROZEN_CATEGORY_ID: "category", SQUARE_SAUCE_VARIATION_ID: "sauce",
    ...settings
  })) vi.stubEnv(key, value);
}

afterEach(() => vi.unstubAllEnvs());

describe("Square environment", () => {
  it.each(invalidSquareSettings)("rejects invalid configuration %j", (settings) => {
    configure(settings);
    expect(() => getSquareEnv()).toThrow(/SQUARE_ENV must|SQUARE_HOST must/);
  });

  it.each([
    ["sandbox", "https://connect.squareupsandbox.com"],
    ["production", "https://connect.squareup.com"]
  ])("derives and accepts only the %s origin", (environment, host) => {
    configure({ SQUARE_ENV: environment });
    expect(getSquareEnv()).toMatchObject({ environment, host, accessToken: "synthetic-token" });
    vi.stubEnv("SQUARE_HOST", host);
    expect(getSquareEnv()).toMatchObject({ environment, host });
  });

  it.each(["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID", "SQUARE_FROZEN_CATEGORY_ID", "SQUARE_SAUCE_VARIATION_ID"])(
    "still requires %s", (key) => {
      configure({ [key]: undefined });
      expect(() => getSquareEnv()).toThrow("Missing Square environment variables");
    }
  );
});
