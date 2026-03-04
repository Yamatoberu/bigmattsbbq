"use client";

import { useCallback, useEffect, useState } from "react";
import { FrozenItemDTO } from "../../lib/types";

interface FrozenItemsState {
  items: FrozenItemDTO[];
  isLoading: boolean;
  error?: string;
}

export function useFrozenItems() {
  const [state, setState] = useState<FrozenItemsState>({
    items: [],
    isLoading: true
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const response = await fetch("/api/frozen-items", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to load frozen items");
      }
      const data = (await response.json()) as FrozenItemDTO[];
      setState({ items: data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load frozen items";
      setState({ items: [], isLoading: false, error: message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    reload: load
  };
}
