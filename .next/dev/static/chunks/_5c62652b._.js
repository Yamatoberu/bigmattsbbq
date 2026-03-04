(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/cart.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "isSauceBumpNeeded",
    ()=>isSauceBumpNeeded,
    "mergeCartItems",
    ()=>mergeCartItems,
    "resolvePackageToCartItems",
    ()=>resolvePackageToCartItems
]);
function mergeCartItems(current, added) {
    const map = new Map();
    for (const item of current){
        map.set(item.variationId, (map.get(item.variationId) || 0) + item.quantity);
    }
    for (const item of added){
        map.set(item.variationId, (map.get(item.variationId) || 0) + item.quantity);
    }
    return Array.from(map.entries()).filter(([, quantity])=>quantity > 0).map(([variationId, quantity])=>({
            variationId,
            quantity
        }));
}
function normalizeMatch(value) {
    return value.trim().toLowerCase();
}
function resolvePackageToCartItems(packageConfig, items) {
    const resolved = [];
    for (const entry of packageConfig.items){
        let variationId = entry.variationId;
        if (!variationId && entry.itemName) {
            const item = items.find((candidate)=>normalizeMatch(candidate.name).includes(normalizeMatch(entry.itemName)));
            if (item) {
                if (entry.variationName) {
                    const variation = item.variations.find((candidate)=>normalizeMatch(candidate.name).includes(normalizeMatch(entry.variationName)));
                    variationId = variation?.variationId;
                } else {
                    variationId = item.variations[0]?.variationId;
                }
            }
        }
        if (variationId) {
            resolved.push({
                variationId,
                quantity: entry.quantity
            });
        }
    }
    return resolved;
}
function isSauceBumpNeeded(items, sauceVariationId) {
    const sauceQty = items.filter((item)=>item.variationId === sauceVariationId).reduce((sum, item)=>sum + item.quantity, 0);
    const meatQty = items.filter((item)=>item.variationId !== sauceVariationId).reduce((sum, item)=>sum + item.quantity, 0);
    return meatQty > 0 && sauceQty === 0;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/cart/CartContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CartProvider",
    ()=>CartProvider,
    "useCart",
    ()=>useCart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$cart$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/cart.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
const CartContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(undefined);
const STORAGE_KEY = "big-matts-bbq-cart";
function CartProvider({ children }) {
    _s();
    const [items, setItems] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isReady, setIsReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CartProvider.useEffect": ()=>{
            const stored = ("TURBOPACK compile-time truthy", 1) ? window.localStorage.getItem(STORAGE_KEY) : "TURBOPACK unreachable";
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setItems(parsed);
                } catch  {
                    setItems([]);
                }
            }
            setIsReady(true);
        }
    }["CartProvider.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CartProvider.useEffect": ()=>{
            if (!isReady) return;
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        }
    }["CartProvider.useEffect"], [
        items,
        isReady
    ]);
    const addItem = (item)=>{
        setItems((prev)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$cart$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mergeCartItems"])(prev, [
                item
            ]));
    };
    const addItems = (newItems)=>{
        setItems((prev)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$cart$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mergeCartItems"])(prev, newItems));
    };
    const setQuantity = (variationId, quantity)=>{
        setItems((prev)=>{
            if (quantity <= 0) {
                return prev.filter((item)=>item.variationId !== variationId);
            }
            return prev.map((item)=>item.variationId === variationId ? {
                    ...item,
                    quantity
                } : item);
        });
    };
    const removeItem = (variationId)=>{
        setItems((prev)=>prev.filter((item)=>item.variationId !== variationId));
    };
    const clear = ()=>setItems([]);
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "CartProvider.useMemo[value]": ()=>({
                items,
                isReady,
                addItem,
                addItems,
                setQuantity,
                removeItem,
                clear
            })
    }["CartProvider.useMemo[value]"], [
        items,
        isReady
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(CartContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/components/cart/CartContext.tsx",
        lineNumber: 72,
        columnNumber: 10
    }, this);
}
_s(CartProvider, "f7m4cBlpGJcikDSPBPZzaNZ0NT8=");
_c = CartProvider;
function useCart() {
    _s1();
    const context = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(CartContext);
    if (!context) {
        throw new Error("useCart must be used within CartProvider");
    }
    return context;
}
_s1(useCart, "b9L3QQ+jgeyIrH0NfHrJ8nn7VMU=");
var _c;
__turbopack_context__.k.register(_c, "CartProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/providers.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Providers",
    ()=>Providers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$cart$2f$CartContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/cart/CartContext.tsx [app-client] (ecmascript)");
"use client";
;
;
function Providers({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$cart$2f$CartContext$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CartProvider"], {
        children: children
    }, void 0, false, {
        fileName: "[project]/app/providers.tsx",
        lineNumber: 7,
        columnNumber: 10
    }, this);
}
_c = Providers;
var _c;
__turbopack_context__.k.register(_c, "Providers");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_5c62652b._.js.map