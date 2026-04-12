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
"[project]/lib/supabase.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getSupabaseClient",
    ()=>getSupabaseClient
]);
// Server-only singleton. Import only from API routes.
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
;
let _client;
function getSupabaseClient() {
    if (_client) return _client;
    const url = process.env.SUPABASE_URL || ("TURBOPACK compile-time value", "https://wpziabhigztyjrmjpmbw.supabase.co");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("Missing Supabase environment variables. Check SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
    }
    _client = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
    return _client;
}
}),
"[project]/lib/drops.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "checkDropReady",
    ()=>checkDropReady,
    "fetchActiveDrop",
    ()=>fetchActiveDrop,
    "formatPickupDate",
    ()=>formatPickupDate
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$server$2d$only$2f$empty$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/server-only/empty.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/supabase.ts [app-route] (ecmascript)");
;
;
function formatPickupDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "America/Denver"
    });
}
async function fetchActiveDrop() {
    const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$supabase$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getSupabaseClient"])();
    const { data: drop, error: dropErr } = await supabase.from("drops").select("id, title, status, order_cutoff_at, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket").eq("status", "active").order("created_at", {
        ascending: false
    }).limit(1).maybeSingle();
    if (dropErr) {
        throw dropErr;
    }
    if (!drop) {
        return null;
    }
    const { data: pickupRows, error: pickupErr } = await supabase.from("drop_pickup_options").select("id, location_label, pickup_date, pickup_at, capacity_pulled_pork, capacity_brisket, reserved_pulled_pork, reserved_brisket").eq("drop_id", drop.id).order("pickup_at", {
        ascending: true
    });
    if (pickupErr) {
        throw pickupErr;
    }
    const pickupOptions = (pickupRows ?? []).map((row)=>({
            id: row.id,
            locationLabel: row.location_label,
            pickupDateLabel: formatPickupDate(row.pickup_at),
            pickupAtISO: row.pickup_at,
            isSoldOut: row.reserved_pulled_pork >= row.capacity_pulled_pork && row.reserved_brisket >= row.capacity_brisket
        }));
    return {
        id: drop.id,
        title: drop.title,
        status: drop.status,
        orderCutoffAt: drop.order_cutoff_at,
        capacity: {
            pulledPork: {
                total: drop.capacity_pulled_pork,
                reserved: drop.reserved_pulled_pork
            },
            brisket: {
                total: drop.capacity_brisket,
                reserved: drop.reserved_brisket
            }
        },
        soldOut: {
            pulledPork: drop.reserved_pulled_pork >= drop.capacity_pulled_pork,
            brisket: drop.reserved_brisket >= drop.capacity_brisket
        },
        pickupOptions
    };
}
function checkDropReady(drop) {
    if (!drop) {
        return {
            ok: false,
            status: 404,
            error: "Drop not found."
        };
    }
    if (drop.status !== "active") {
        return {
            ok: false,
            status: 409,
            error: "This drop has closed. Orders are no longer being accepted."
        };
    }
    if (drop.order_cutoff_at !== null) {
        const cutoffMs = Date.parse(drop.order_cutoff_at);
        if (!Number.isNaN(cutoffMs) && cutoffMs <= Date.now()) {
            return {
                ok: false,
                status: 409,
                error: "This drop has closed. Orders are no longer being accepted."
            };
        }
    }
    const globallySoldOut = drop.reserved_pulled_pork >= drop.capacity_pulled_pork && drop.reserved_brisket >= drop.capacity_brisket;
    if (globallySoldOut) {
        return {
            ok: false,
            status: 409,
            error: "This drop has sold out. No more orders can be taken."
        };
    }
    return {
        ok: true
    };
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
"[project]/app/api/drop/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "dynamic",
    ()=>dynamic,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$drops$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/drops.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/logger.ts [app-route] (ecmascript)");
;
;
;
;
const runtime = "nodejs";
const dynamic = "force-dynamic";
async function GET() {
    const headerList = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])();
    const requestId = headerList.get("x-request-id") ?? crypto.randomUUID();
    try {
        const drop = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$drops$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["fetchActiveDrop"])();
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(drop, {
            headers: {
                "x-request-id": requestId
            }
        });
    } catch (error) {
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$logger$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["logError"])("Failed to load active drop", error, requestId);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: "Unable to load drop info right now.",
            requestId
        }, {
            status: 500,
            headers: {
                "x-request-id": requestId
            }
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__52b1b480._.js.map