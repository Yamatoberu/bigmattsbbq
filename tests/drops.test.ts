import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult<T> = { data: T; error: unknown };

interface DropRow {
  id: string;
  title: string;
  status: string;
  order_cutoff_at: string | null;
}

interface PickupRow {
  id: string;
  location_label: string;
  pickup_date: string;
  pickup_start_date: string;
  pickup_end_date: string;
}

function buildMockClient(
  dropResult: QueryResult<DropRow | null>,
  pickupResult: QueryResult<PickupRow[] | null>
) {
  return {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = () => chain;
      chain.order = () => {
        if (table === "drop_pickup_options") {
          return {
            then: (resolve: (value: QueryResult<PickupRow[] | null>) => unknown) =>
              Promise.resolve(pickupResult).then(resolve)
          };
        }
        return chain;
      };
      chain.limit = () => chain;
      chain.maybeSingle = () => Promise.resolve(dropResult);
      return chain;
    }
  };
}

function mockSupabaseModule(client: ReturnType<typeof buildMockClient>) {
  vi.doMock("../lib/supabase", () => ({
    getSupabaseClient: () => client
  }));
  vi.doMock("server-only", () => ({}));
}

describe("fetchActiveDrop", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock("../lib/supabase");
    vi.doUnmock("server-only");
  });

  it("returns DropDTO when an active drop exists", async () => {
    const dropRow: DropRow = {
      id: "d1",
      title: "April 2026 Drop",
      status: "active",
      order_cutoff_at: "2026-05-08T23:59:59-06:00"
    };
    const pickupRows: PickupRow[] = [
      {
        id: "p1",
        location_label: "Preston",
        pickup_date: "2026-05-09",
        pickup_start_date: "2026-05-09",
        pickup_end_date: "2026-05-09"
      },
      {
        id: "p2",
        location_label: "Orem",
        pickup_date: "2026-05-10",
        pickup_start_date: "2026-05-10",
        pickup_end_date: "2026-05-12"
      }
    ];

    mockSupabaseModule(
      buildMockClient({ data: dropRow, error: null }, { data: pickupRows, error: null })
    );

    const { fetchActiveDrop } = await import("../lib/drops");
    const result = await fetchActiveDrop();

    expect(result).not.toBeNull();
    expect(result!.id).toBe("d1");
    expect(result!.title).toBe("April 2026 Drop");
    expect(result!.status).toBe("active");
    expect(result!.orderCutoffAt).toBe("2026-05-08T23:59:59-06:00");
    expect(result!.pickupOptions).toHaveLength(2);
    expect(result!.pickupOptions[0].id).toBe("p1");
    expect(result!.pickupOptions[0].locationLabel).toBe("Preston");
    expect(result!.pickupOptions[0].pickupDateLabel).toBe("May 9");
    expect(result!.pickupOptions[1].pickupDateLabel).toBe("May 10 – May 12");
  });

  it("returns null when no active drop row exists", async () => {
    mockSupabaseModule(
      buildMockClient({ data: null, error: null }, { data: [], error: null })
    );

    const { fetchActiveDrop } = await import("../lib/drops");
    const result = await fetchActiveDrop();

    expect(result).toBeNull();
  });

  it("throws when Supabase returns an error on the drops query", async () => {
    mockSupabaseModule(
      buildMockClient(
        { data: null, error: new Error("RLS denied") },
        { data: [], error: null }
      )
    );

    const { fetchActiveDrop } = await import("../lib/drops");
    await expect(fetchActiveDrop()).rejects.toThrow("RLS denied");
  });
});

describe("formatPickupDate / formatPickupWindow", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
  });

  afterEach(() => {
    vi.doUnmock("server-only");
  });

  it("formatPickupDate renders a date-only string without shifting a day (regression guard)", async () => {
    const { formatPickupDate } = await import("../lib/drops");
    expect(formatPickupDate("2026-09-03")).toBe("Sep 3");
    expect(formatPickupDate("2026-01-01")).toBe("Jan 1");
  });

  it("formatPickupWindow returns a single date when the bounds are equal", async () => {
    const { formatPickupWindow } = await import("../lib/drops");
    expect(formatPickupWindow("2026-09-03", "2026-09-03")).toBe("Sep 3");
  });

  it("formatPickupWindow returns an en-dash range when the bounds differ", async () => {
    const { formatPickupWindow } = await import("../lib/drops");
    expect(formatPickupWindow("2026-09-01", "2026-09-03")).toBe("Sep 1 – Sep 3");
  });
});
