import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult<T> = { data: T; error: unknown };

interface DropRow {
  id: string;
  title: string;
  status: string;
  order_cutoff_at: string | null;
  capacity_pulled_pork: number;
  capacity_brisket: number;
  reserved_pulled_pork: number;
  reserved_brisket: number;
}

interface PickupRow {
  id: string;
  location_label: string;
  pickup_date: string;
  pickup_at: string;
  capacity_pulled_pork: number;
  capacity_brisket: number;
  reserved_pulled_pork: number;
  reserved_brisket: number;
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
      order_cutoff_at: "2026-05-08T23:59:59-06:00",
      capacity_pulled_pork: 200,
      capacity_brisket: 200,
      reserved_pulled_pork: 50,
      reserved_brisket: 50
    };
    const pickupRows: PickupRow[] = [
      {
        id: "p1",
        location_label: "Preston",
        pickup_date: "2026-05-09",
        pickup_at: "2026-05-09T16:00:00-06:00",
        capacity_pulled_pork: 100,
        capacity_brisket: 100,
        reserved_pulled_pork: 25,
        reserved_brisket: 25
      },
      {
        id: "p2",
        location_label: "Orem",
        pickup_date: "2026-05-10",
        pickup_at: "2026-05-10T16:00:00-06:00",
        capacity_pulled_pork: 100,
        capacity_brisket: 100,
        reserved_pulled_pork: 25,
        reserved_brisket: 25
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
    expect(result!.capacity.pulledPork.total).toBe(200);
    expect(result!.capacity.pulledPork.reserved).toBe(50);
    expect(result!.capacity.brisket.total).toBe(200);
    expect(result!.capacity.brisket.reserved).toBe(50);
    expect(result!.soldOut.pulledPork).toBe(false);
    expect(result!.soldOut.brisket).toBe(false);
    expect(result!.pickupOptions).toHaveLength(2);
    expect(result!.pickupOptions[0].id).toBe("p1");
    expect(result!.pickupOptions[0].locationLabel).toBe("Preston");
    expect(result!.pickupOptions[0].pickupAtISO).toBe("2026-05-09T16:00:00-06:00");
    expect(result!.pickupOptions[0].isSoldOut).toBe(false);
  });

  it("returns null when no active drop row exists", async () => {
    mockSupabaseModule(
      buildMockClient({ data: null, error: null }, { data: [], error: null })
    );

    const { fetchActiveDrop } = await import("../lib/drops");
    const result = await fetchActiveDrop();

    expect(result).toBeNull();
  });

  it("derives soldOut correctly when capacity reached", async () => {
    const dropRow: DropRow = {
      id: "d2",
      title: "Sold-Out Pork Drop",
      status: "active",
      order_cutoff_at: null,
      capacity_pulled_pork: 200,
      capacity_brisket: 200,
      reserved_pulled_pork: 200,
      reserved_brisket: 100
    };

    mockSupabaseModule(
      buildMockClient({ data: dropRow, error: null }, { data: [], error: null })
    );

    const { fetchActiveDrop } = await import("../lib/drops");
    const result = await fetchActiveDrop();

    expect(result).not.toBeNull();
    expect(result!.soldOut.pulledPork).toBe(true);
    expect(result!.soldOut.brisket).toBe(false);
  });

  it("derives pickupOption.isSoldOut only when both products sold out", async () => {
    const dropRow: DropRow = {
      id: "d3",
      title: "Mixed Pickup Drop",
      status: "active",
      order_cutoff_at: null,
      capacity_pulled_pork: 200,
      capacity_brisket: 200,
      reserved_pulled_pork: 100,
      reserved_brisket: 100
    };
    const pickupRows: PickupRow[] = [
      {
        id: "p-full",
        location_label: "Preston",
        pickup_date: "2026-05-09",
        pickup_at: "2026-05-09T16:00:00-06:00",
        capacity_pulled_pork: 100,
        capacity_brisket: 100,
        reserved_pulled_pork: 100,
        reserved_brisket: 100
      },
      {
        id: "p-partial",
        location_label: "Orem",
        pickup_date: "2026-05-10",
        pickup_at: "2026-05-10T16:00:00-06:00",
        capacity_pulled_pork: 100,
        capacity_brisket: 100,
        reserved_pulled_pork: 100,
        reserved_brisket: 25
      }
    ];

    mockSupabaseModule(
      buildMockClient({ data: dropRow, error: null }, { data: pickupRows, error: null })
    );

    const { fetchActiveDrop } = await import("../lib/drops");
    const result = await fetchActiveDrop();

    expect(result).not.toBeNull();
    expect(result!.pickupOptions).toHaveLength(2);
    expect(result!.pickupOptions[0].isSoldOut).toBe(true);
    expect(result!.pickupOptions[1].isSoldOut).toBe(false);
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
