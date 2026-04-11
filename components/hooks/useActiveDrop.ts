"use client";

import { useCallback, useEffect, useState } from "react";
import { DropDTO } from "../../lib/types";

interface ActiveDropState {
  drop: DropDTO | null;
  isLoading: boolean;
  error?: string;
}

const POLL_INTERVAL_MS = 30_000;

export function useActiveDrop(initialDrop: DropDTO | null = null) {
  const [state, setState] = useState<ActiveDropState>({
    drop: initialDrop,
    isLoading: initialDrop === null
  });

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/drop", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to load drop");
      }
      const data = (await response.json()) as DropDTO | null;
      setState({ drop: data, isLoading: false, error: undefined });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load drop";
      setState((prev) => ({ drop: prev.drop, isLoading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  return {
    ...state,
    reload: load
  };
}
