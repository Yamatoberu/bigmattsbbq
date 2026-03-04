module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[project]/lib/env.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSquareEnv",
    ()=>getSquareEnv
]);
function getSquareEnv() {
    const host = process.env.SQUARE_HOST || "https://connect.squareup.com";
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;
    const frozenCategoryId = process.env.SQUARE_FROZEN_CATEGORY_ID;
    const sauceVariationId = process.env.SQUARE_SAUCE_VARIATION_ID;
    const environment = process.env.SQUARE_ENV || "sandbox";
    if (!accessToken || !locationId || !frozenCategoryId || !sauceVariationId) {
        throw new Error("Missing Square environment variables. Check SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_FROZEN_CATEGORY_ID, SQUARE_SAUCE_VARIATION_ID.");
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
}),
"[project]/lib/normalizers.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "joinInventoryCounts",
    ()=>joinInventoryCounts
]);
function joinInventoryCounts(items, counts) {
    const countMap = new Map();
    for (const count of counts){
        const quantity = count.quantity ? Number.parseInt(count.quantity, 10) : 0;
        if (!Number.isNaN(quantity)) {
            countMap.set(count.catalog_object_id, quantity);
        }
    }
    return items.map((item)=>({
            ...item,
            variations: item.variations.map((variation)=>({
                    ...variation,
                    remaining: countMap.get(variation.variationId) ?? 0
                }))
        }));
}
}),
"[project]/lib/square.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SQUARE_VERSION",
    ()=>SQUARE_VERSION,
    "SquareError",
    ()=>SquareError,
    "batchRetrieveInventoryCounts",
    ()=>batchRetrieveInventoryCounts,
    "batchSetInventoryCounts",
    ()=>batchSetInventoryCounts,
    "createCustomer",
    ()=>createCustomer,
    "createInvoice",
    ()=>createInvoice,
    "createOrder",
    ()=>createOrder,
    "extractVariationIds",
    ()=>extractVariationIds,
    "mapCatalogToFrozenItems",
    ()=>mapCatalogToFrozenItems,
    "publishInvoice",
    ()=>publishInvoice,
    "searchCatalogItems",
    ()=>searchCatalogItems,
    "searchCustomerByEmail",
    ()=>searchCustomerByEmail
]);
const SQUARE_VERSION = "2024-12-18";
class SquareError extends Error {
    status;
    body;
    constructor(message, status, body){
        super(message);
        this.status = status;
        this.body = body;
    }
}
async function squareFetch({ host, accessToken, path, method = "POST", body, requestId }) {
    const response = await fetch(`${host}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "Square-Version": SQUARE_VERSION,
            ...requestId ? {
                "X-Request-Id": requestId
            } : {}
        },
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) {
        throw new SquareError("Square API request failed", response.status, data);
    }
    return data;
}
async function searchCatalogItems(params) {
    const data = await squareFetch({
        host: params.host,
        accessToken: params.accessToken,
        path: "/v2/catalog/search-catalog-items",
        body: {
            include_related_objects: true,
            category_ids: [
                params.categoryId
            ]
        },
        requestId: params.requestId
    });
    return {
        items: data.items ?? [],
        relatedObjects: data.related_objects ?? []
    };
}
async function batchRetrieveInventoryCounts(params) {
    if (params.variationIds.length === 0) {
        return {
            counts: []
        };
    }
    return squareFetch({
        host: params.host,
        accessToken: params.accessToken,
        path: "/v2/inventory/counts/batch-retrieve",
        body: {
            catalog_object_ids: params.variationIds,
            location_ids: [
                params.locationId
            ],
            states: [
                "IN_STOCK"
            ]
        },
        requestId: params.requestId
    });
}
async function searchCustomerByEmail(params) {
    return squareFetch({
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
async function createCustomer(params) {
    return squareFetch({
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
async function createOrder(params) {
    return squareFetch({
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
async function createInvoice(params) {
    return squareFetch({
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
async function publishInvoice(params) {
    return squareFetch({
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
async function batchSetInventoryCounts(params) {
    return squareFetch({
        host: params.host,
        accessToken: params.accessToken,
        path: "/v2/inventory/changes/batch-create",
        body: {
            idempotency_key: params.idempotencyKey,
            changes: params.changes.map((change)=>({
                    type: "PHYSICAL_COUNT",
                    physical_count: {
                        catalog_object_id: change.variationId,
                        location_id: params.locationId,
                        quantity: change.quantity.toString(),
                        state: "IN_STOCK",
                        occurred_at: new Date().toISOString()
                    }
                }))
        },
        requestId: params.requestId
    });
}
function mapCatalogToFrozenItems(params) {
    const variationMap = new Map();
    for (const related of params.relatedObjects){
        if (related.type === "ITEM_VARIATION") {
            variationMap.set(related.id, related);
        }
    }
    return params.items.filter((item)=>item.type === "ITEM").map((item)=>{
        const itemData = item.item_data || {};
        const variations = (itemData.variations || []).map((variation)=>{
            const resolved = variation.item_variation_data ? variation : variationMap.get(variation.id) || variation;
            const priceMoney = resolved.item_variation_data?.price_money;
            return {
                variationId: resolved.id,
                name: resolved.item_variation_data?.name || "Single",
                priceCents: priceMoney?.amount ?? 0,
                currency: priceMoney?.currency ?? "USD",
                remaining: 0
            };
        }).filter((variation)=>Boolean(variation.variationId));
        return {
            itemId: item.id,
            name: itemData.name || "Untitled",
            description: itemData.description || "",
            variations
        };
    });
}
function extractVariationIds(items) {
    return items.flatMap((item)=>item.variations.map((variation)=>variation.variationId));
}
}),
"[project]/lib/logger.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "logError",
    ()=>logError
]);
function logError(message, error, requestId) {
    const normalized = error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
    } : {
        error
    };
    console.error({
        requestId,
        message,
        ...normalized
    });
}
}),
"[project]/app/api/frozen-items/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/env.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$normalizers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/normalizers.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$square$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/square.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger.ts [app-route] (ecmascript)");
;
;
;
;
;
;
const runtime = "nodejs";
async function GET() {
    const requestId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])().get("x-request-id") ?? crypto.randomUUID();
    try {
        const env = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$env$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSquareEnv"])();
        const { items, relatedObjects } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$square$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["searchCatalogItems"])({
            host: env.host,
            accessToken: env.accessToken,
            categoryId: env.frozenCategoryId,
            requestId
        });
        const frozenItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$square$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["mapCatalogToFrozenItems"])({
            items,
            relatedObjects
        });
        const variationIds = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$square$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["extractVariationIds"])(frozenItems);
        const inventory = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$square$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["batchRetrieveInventoryCounts"])({
            host: env.host,
            accessToken: env.accessToken,
            locationId: env.locationId,
            variationIds,
            requestId
        });
        const withInventory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$normalizers$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["joinInventoryCounts"])(frozenItems, inventory.counts ?? []);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(withInventory);
    } catch (error) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logError"])("Failed to load frozen items", error, requestId);
        const status = error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$square$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["SquareError"] ? error.status : 500;
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unable to load frozen menu right now. Please try again.",
            requestId
        }, {
            status
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__7d92a3dc._.js.map