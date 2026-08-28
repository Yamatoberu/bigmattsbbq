"use client";

import { useCallback, useEffect, useState } from "react";
import { AttributionSourceDTO } from "../../lib/types";

interface AttributionSourcesState {
  sources: AttributionSourceDTO[];
  isLoading: boolean;
  error?: string;
}

export function useAttributionSources() {
  const [state, setState] = useState<AttributionSourcesState>({
    sources: [],
    isLoading: true
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
    try {
      const response = await fetch("/api/attribution-sources", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Unable to load attribution sources");
      }
      const data = (await response.json()) as AttributionSourceDTO[];
      setState({ sources: data, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load attribution sources";
      setState({ sources: [], isLoading: false, error: message });
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
