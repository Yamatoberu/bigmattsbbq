import { FrozenItemDTO } from "./types";

export const SQUARE_VERSION = "2026-07-15";

export class SquareError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "SquareError";
    this.status = status;
    this.body = body;
  }
}

interface SquareFetchOptions {
  host: string;
  accessToken: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  requestId?: string;
}

async function squareFetch<T>({
  host,
  accessToken,
  path,
  method = "POST",
  body,
  requestId
}: SquareFetchOptions): Promise<T> {
  const response = await fetch(`${host}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
      ...(requestId ? { "X-Request-Id": requestId } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new SquareError(`Square API request failed: ${method} ${path}`, response.status, data);
  }

  return data as T;
}

type CatalogObject = {
  id: string;
  type: string;
  item_data?: {
    name?: string;
    description?: string;
    variations?: CatalogObject[];
  };
  item_variation_data?: {
    name?: string;
    price_money?: {
      amount?: number;
      currency?: string;
    };
  };
};

export async function searchCatalogItems(params: {
  host: string;
  accessToken: string;
  categoryId: string;
  requestId?: string;
}) {
  const data = await squareFetch<{
    items?: CatalogObject[];
    related_objects?: CatalogObject[];
  }>({
    host: params.host,
    accessToken: params.accessToken,
    path: "/v2/catalog/search-catalog-items",
    body: {
      include_related_objects: true,
      category_ids: [params.categoryId]
    },
    requestId: params.requestId
  });

  return {
    items: data.items ?? [],
    relatedObjects: data.related_objects ?? []
  };
}

export async function searchCustomerByEmail(params: {
  host: string;
  accessToken: string;
  email: string;
  requestId?: string;
}) {
  return squareFetch<{ customers?: { id: string }[] }>({
    host: params.host,
    accessToken: params.accessToken,
    path: "/v2/customers/search",
    body: {
      query: {
        filter: {
          email_address: {
            exact: params.email
          }
        }
      }
    },
    requestId: params.requestId
  });
}

export async function createCustomer(params: {
  host: string;
  accessToken: string;
  requestId?: string;
  body: {
    given_name: string;
    family_name: string;
    email_address: string;
    phone_number?: string;
  };
  idempotencyKey: string;
}) {
  return squareFetch<{ customer?: { id: string } }>({
    host: params.host,
    accessToken: params.accessToken,
    path: "/v2/customers",
    body: {
      idempotency_key: params.idempotencyKey,
      ...params.body
    },
    requestId: params.requestId
  });
}

export async function createOrder(params: {
  host: string;
  accessToken: string;
  requestId?: string;
  body: Record<string, unknown>;
  idempotencyKey: string;
}) {
  return squareFetch<{
    order?: {
      id: string;
      total_money?: { amount: number };
      line_items?: Array<{ name?: string; quantity?: string }>;
    };
  }>({
    host: params.host,
    accessToken: params.accessToken,
    path: "/v2/orders",
    body: {
      idempotency_key: params.idempotencyKey,
      ...params.body
    },
    requestId: params.requestId
  });
}

export async function createInvoice(params: {
  host: string;
  accessToken: string;
  requestId?: string;
  body: Record<string, unknown>;
  idempotencyKey: string;
}) {
  return squareFetch<{ invoice?: { id: string; version: number } }>({
    host: params.host,
    accessToken: params.accessToken,
    path: "/v2/invoices",
    body: {
      idempotency_key: params.idempotencyKey,
      ...params.body
    },
    requestId: params.requestId
  });
}

export async function publishInvoice(params: {
  host: string;
  accessToken: string;
  requestId?: string;
  invoiceId: string;
  version: number;
  idempotencyKey: string;
}) {
  return squareFetch<{ invoice?: { id: string } }>({
    host: params.host,
    accessToken: params.accessToken,
    path: `/v2/invoices/${params.invoiceId}/publish`,
    body: {
      idempotency_key: params.idempotencyKey,
      version: params.version
    },
    requestId: params.requestId
  });
}

export function mapCatalogToFrozenItems(params: {
  items: CatalogObject[];
  relatedObjects: CatalogObject[];
}): FrozenItemDTO[] {
  const variationMap = new Map<string, CatalogObject>();
  for (const related of params.relatedObjects) {
    if (related.type === "ITEM_VARIATION") {
      variationMap.set(related.id, related);
    }
  }

  return params.items
    .filter((item) => item.type === "ITEM")
    .map((item) => {
      const itemData = item.item_data || {};
      const variations = (itemData.variations || [])
        .map((variation) => {
          const resolved = variation.item_variation_data
            ? variation
            : variationMap.get(variation.id) || variation;
          const priceMoney = resolved.item_variation_data?.price_money;
          return {
            variationId: resolved.id,
            name: resolved.item_variation_data?.name || "Single",
            priceCents: priceMoney?.amount ?? 0,
            currency: priceMoney?.currency ?? "USD"
          };
        })
        .filter((variation) => Boolean(variation.variationId));

      return {
        itemId: item.id,
        name: itemData.name || "Untitled",
        description: itemData.description || "",
        variations
      };
    });
}

function truncateToByteLimit(value: string, limit: number): string {
  if (Buffer.byteLength(value, "utf8") <= limit) {
    return value;
  }

  const codePoints = Array.from(value).slice(0, limit);
  while (codePoints.length > 0 && Buffer.byteLength(codePoints.join(""), "utf8") > limit) {
    codePoints.pop();
  }

  return codePoints.join("");
}

export function buildAttributionMetadata(params: {
  code?: string;
  detail?: string;
}): Record<string, string> | undefined {
  const rawCode = params?.code;
  const trimmedCode = typeof rawCode === "string" ? rawCode.trim() : "";
  if (!trimmedCode) {
    return undefined;
  }

  const metadata: Record<string, string> = {
    attribution_source: truncateToByteLimit(trimmedCode, 60)
  };

  const rawDetail = params?.detail;
  const trimmedDetail = typeof rawDetail === "string" ? rawDetail.trim() : "";
  if (trimmedDetail) {
    metadata.attribution_detail = truncateToByteLimit(trimmedDetail, 255);
  }

  return metadata;
}
