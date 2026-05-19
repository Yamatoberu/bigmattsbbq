export interface SquareEnv {
  host: string;
  accessToken: string;
  locationId: string;
  frozenCategoryId: string;
  sauceVariationId: string;
  environment: "sandbox" | "production";
}

export function getSquareEnv(): SquareEnv {
  const host = process.env.SQUARE_HOST || "https://connect.squareup.com";
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const frozenCategoryId = process.env.SQUARE_FROZEN_CATEGORY_ID;
  const sauceVariationId = process.env.SQUARE_SAUCE_VARIATION_ID;
  const environment = (process.env.SQUARE_ENV as SquareEnv["environment"]) || "sandbox";

  if (!accessToken || !locationId || !frozenCategoryId || !sauceVariationId) {
    throw new Error(
      "Missing Square environment variables. Check SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_FROZEN_CATEGORY_ID, SQUARE_SAUCE_VARIATION_ID."
    );
  }

  return {
    host,
    accessToken,
    locationId,
    frozenCategoryId,
    sauceVariationId,
    environment
  };
}

export interface ResendEnv {
  apiKey: string;
  segmentId: string;
}

export function getResendEnv(): ResendEnv {
  const apiKey = process.env.RESEND_API_KEY;
  const segmentId = process.env.RESEND_SEGMENT_ID;

  if (!apiKey || !segmentId) {
    throw new Error(
      "Missing Resend environment variables. Check RESEND_API_KEY and RESEND_SEGMENT_ID."
    );
  }

  return { apiKey, segmentId };
}

