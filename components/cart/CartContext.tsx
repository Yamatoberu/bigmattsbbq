"use client";

import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { CartItem, mergeCartItems } from "../../lib/cart";

interface CartContextValue {
  items: CartItem[];
  isReady: boolean;
  addItem: (item: CartItem) => void;
  addItems: (items: CartItem[]) => void;
  setQuantity: (variationId: string, quantity: number) => void;
  removeItem: (variationId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "big-matts-bbq-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CartItem[];
        setItems(parsed);
      } catch {
        setItems([]);
      }
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, isReady]);

  const addItem = (item: CartItem) => {
    setItems((prev) => mergeCartItems(prev, [item]));
  };

  const addItems = (newItems: CartItem[]) => {
    setItems((prev) => mergeCartItems(prev, newItems));
  };

  const setQuantity = (variationId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.variationId !== variationId);
      }
      return prev.map((item) =>
        item.variationId === variationId ? { ...item, quantity } : item
      );
    });
  };

  const removeItem = (variationId: string) => {
    setItems((prev) => prev.filter((item) => item.variationId !== variationId));
  };

  const clear = () => setItems([]);

  const value = useMemo(
    () => ({ items, isReady, addItem, addItems, setQuantity, removeItem, clear }),
    [items, isReady]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
