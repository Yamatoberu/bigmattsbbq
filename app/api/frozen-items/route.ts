import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getSquareEnv } from "../../../lib/env";
import {
  mapCatalogToFrozenItems,
  searchCatalogItems,
  SquareError
} from "../../../lib/square";
import { logError } from "../../../lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const headerList = await headers();
  const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();

  try {
    const env = getSquareEnv();

    const { items, relatedObjects } = await searchCatalogItems({
      host: env.host,
      accessToken: env.accessToken,
      categoryId: env.frozenCategoryId,
      requestId
    });

    const frozenItems = mapCatalogToFrozenItems({ items, relatedObjects });
    return NextResponse.json(frozenItems);
  } catch (error) {
    logError("Failed to load frozen items", error, requestId);
    const status = error instanceof SquareError ? error.status : 500;
    return NextResponse.json(
      {
        error: "Unable to load frozen menu right now. Please try again.",
        requestId
      },
      { status }
    );
  }
}
