// Shared by the Next.js application and standalone attribution script.
export function getSquareOrigin(environment, host) {
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("SQUARE_ENV must explicitly be sandbox or production");
  }
  const origin = environment === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
  if (host !== undefined && host !== origin) {
    throw new Error("SQUARE_HOST must exactly match the official origin for SQUARE_ENV");
  }
  return origin;
}
