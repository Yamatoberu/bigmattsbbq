const ORIGINS = Object.freeze({
  sandbox: "https://connect.squareupsandbox.com",
  production: "https://connect.squareup.com"
});

export function getSquareOrigin(environment, host) {
  if (environment !== "sandbox" && environment !== "production") {
    throw new Error("SQUARE_ENV must explicitly be sandbox or production");
  }
  const origin = ORIGINS[environment];
  if (host !== undefined && host !== origin) {
    throw new Error("SQUARE_HOST must exactly match the official origin for SQUARE_ENV");
  }
  return origin;
}

export function validateRequest(args, origin) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new Error("Request arguments must be an object");
  }
  if (Object.keys(args).some((key) => !["method", "path", "body", "requestId"].includes(key))) {
    throw new Error("Unknown request argument");
  }
  const { method, path, body, requestId } = args;
  if (!["GET", "POST", "PUT", "DELETE"].includes(method)) {
    throw new Error("Unsupported HTTP method");
  }
  if (typeof path !== "string" || !path.startsWith("/v2/") ||
      /[\\#\s\u0000-\u001f\u007f]/u.test(path) || /%(?![0-9a-f]{2})/iu.test(path)) {
    throw new Error("Path must be a valid rooted /v2/ API path without fragments or backslashes");
  }
  const pathname = path.split("?")[0];
  for (const segment of pathname.split("/")) {
    const decoded = decodeURIComponent(segment);
    if (decoded.split("/").some((part) => part === "." || part === "..") ||
        /[\\\u0000-\u001f\u007f]/u.test(decoded)) {
      throw new Error("Unsafe API path segment");
    }
  }
  const destination = new URL(path, origin);
  if (destination.origin !== origin || destination.username || destination.password ||
      !destination.pathname.startsWith("/v2/")) {
    throw new Error("Destination must remain on the configured Square origin");
  }
  if (body !== undefined && (!body || typeof body !== "object" || Array.isArray(body))) {
    throw new Error("Request body must be an object");
  }
  if (method === "GET" && body !== undefined) {
    throw new Error("GET requests must omit the body");
  }
  if (requestId !== undefined && (typeof requestId !== "string" ||
      !/^[\x21-\x7e]{1,128}$/u.test(requestId))) {
    throw new Error("requestId must contain 1 to 128 visible ASCII characters");
  }
  return { method, url: destination.href, body, requestId };
}
