import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type QueryResult<T> = { data: T; error: unknown };

interface DropRow {
  id: string;
  title: string;
  status: string;
  order_cutoff_at: string | null;
  capacity_pulled_pork: number;
  capacity_brisket: number;
  capacity_sauce: number;
  capacity_family_night: number;
  capacity_backyard_host: number;
  capacity_freezer_filler: number;
  reserved_pulled_pork: number;
  reserved_brisket: number;
  reserved_sauce: number;
  reserved_family_night: number;
  reserved_backyard_host: number;
  reserved_freezer_filler: number;
  capacity_enforced: boolean;
}

interface PickupRow {
  id: string;
  location_label: string;
  pickup_date: string;
  pickup_at: string;
  capacity_pulled_pork: number;
  capacity_brisket: number;
  capacity_sauce: number;
  capacity_family_night: number;
  capacity_backyard_host: number;
  capacity_freezer_filler: number;
  reserved_pulled_pork: number;
  reserved_brisket: number;
  reserved_sauce: number;
  reserved_family_night: number;
  reserved_backyard_host: number;
  reserved_freezer_filler: number;
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
      capacity_sauce: 200,
      capacity_family_night: 200,
      capacity_backyard_host: 200,
      capacity_freezer_filler: 200,
      reserved_pulled_pork: 50,
      reserved_brisket: 50,
      reserved_sauce: 0,
      reserved_family_night: 0,
      reserved_backyard_host: 0,
      reserved_freezer_filler: 0,
      capacity_enforced: true
    };
    const pickupRows: PickupRow[] = [
      {
        id: "p1",
        location_label: "Preston",
        pickup_date: "2026-05-09",
        pickup_at: "2026-05-09T16:00:00-06:00",
        capacity_pulled_pork: 100,
        capacity_brisket: 100,
        capacity_sauce: 100,
        capacity_family_night: 100,
        capacity_backyard_host: 100,
        capacity_freezer_filler: 100,
        reserved_pulled_pork: 25,
        reserved_brisket: 25,
        reserved_sauce: 0,
        reserved_family_night: 0,
        reserved_backyard_host: 0,
        reserved_freezer_filler: 0
      },
      {
        id: "p2",
        location_label: "Orem",
        pickup_date: "2026-05-10",
        pickup_at: "2026-05-10T16:00:00-06:00",
        capacity_pulled_pork: 100,
        capacity_brisket: 100,
        capacity_sauce: 100,
        capacity_family_night: 100,
        capacity_backyard_host: 100,
        capacity_freezer_filler: 100,
        reserved_pulled_pork: 25,
        reserved_brisket: 25,
        reserved_sauce: 0,
        reserved_family_night: 0,
        reserved_backyard_host: 0,
        reserved_freezer_filler: 0
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
    expect(result!.soldOut.sauce).toBe(false);
    expect(result!.soldOut.familyNight).toBe(false);
    expect(result!.soldOut.backyardHost).toBe(false);
    expect(result!.soldOut.freezerFiller).toBe(false);
    expect(result!.capacity.sauce.total).toBe(200);
    expect(result!.capacity.sauce.reserved).toBe(0);
    expect(result!.capacity.familyNight.total).toBe(200);
    expect(result!.capacity.familyNight.reserved).toBe(0);
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
      capacity_sauce: 200,
      capacity_family_night: 200,
      capacity_backyard_host: 200,
      capacity_freezer_filler: 200,
      reserved_pulled_pork: 200,
      reserved_brisket: 100,
      reserved_sauce: 0,
      reserved_family_night: 0,
      reserved_backyard_host: 0,
      reserved_freezer_filler: 0,
      capacity_enforced: true
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
      capacity_sauce: 200,
      capacity_family_night: 200,
      capacity_backyard_host: 200,
      capacity_freezer_filler: 200,
      reserved_pulled_pork: 100,
      reserved_brisket: 100,
      reserved_sauce: 0,
      reserved_family_night: 0,
      reserved_backyard_host: 0,
      reserved_freezer_filler: 0,
      capacity_enforced: true
    };
    const pickupRows: PickupRow[] = [
      {
        id: "p-full",
        location_label: "Preston",
        pickup_date: "2026-05-09",
        pickup_at: "2026-05-09T16:00:00-06:00",
        capacity_pulled_pork: 100,
        capacity_brisket: 100,
        capacity_sauce: 100,
        capacity_family_night: 100,
        capacity_backyard_host: 100,
        capacity_freezer_filler: 100,
        reserved_pulled_pork: 100,
        reserved_brisket: 100,
        reserved_sauce: 100,
        reserved_family_night: 100,
        reserved_backyard_host: 100,
        reserved_freezer_filler: 100
      },
      {
        id: "p-partial",
        location_label: "Orem",
        pickup_date: "2026-05-10",
        pickup_at: "2026-05-10T16:00:00-06:00",
        capacity_pulled_pork: 100,
        capacity_brisket: 100,
        capacity_sauce: 100,
        capacity_family_night: 100,
        capacity_backyard_host: 100,
        capacity_freezer_filler: 100,
        reserved_pulled_pork: 100,
        reserved_brisket: 25,
        reserved_sauce: 0,
        reserved_family_night: 0,
        reserved_backyard_host: 0,
        reserved_freezer_filler: 0
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

  it("forces soldOut booleans to false when capacity_enforced is false", async () => {
    const dropRow: DropRow = {
      id: "d4",
      title: "Unenforced Drop",
      status: "active",
      order_cutoff_at: null,
      capacity_pulled_pork: 200,
      capacity_brisket: 200,
      capacity_sauce: 200,
      capacity_family_night: 200,
      capacity_backyard_host: 200,
      capacity_freezer_filler: 200,
      reserved_pulled_pork: 200,
      reserved_brisket: 200,
      reserved_sauce: 200,
      reserved_family_night: 200,
      reserved_backyard_host: 200,
      reserved_freezer_filler: 200,
      capacity_enforced: false
    };

    mockSupabaseModule(
      buildMockClient({ data: dropRow, error: null }, { data: [], error: null })
    );

    const { fetchActiveDrop } = await import("../lib/drops");
    const result = await fetchActiveDrop();

    expect(result).not.toBeNull();
    expect(result!.soldOut.pulledPork).toBe(false);
    expect(result!.soldOut.brisket).toBe(false);
    expect(result!.soldOut.sauce).toBe(false);
    expect(result!.soldOut.familyNight).toBe(false);
    expect(result!.soldOut.backyardHost).toBe(false);
    expect(result!.soldOut.freezerFiller).toBe(false);
  });

  it("exposes capacityEnforced on the DTO", async () => {
    const dropRow: DropRow = {
      id: "d5",
      title: "Enforced Drop",
      status: "active",
      order_cutoff_at: null,
      capacity_pulled_pork: 200,
      capacity_brisket: 200,
      capacity_sauce: 200,
      capacity_family_night: 200,
      capacity_backyard_host: 200,
      capacity_freezer_filler: 200,
      reserved_pulled_pork: 50,
      reserved_brisket: 50,
      reserved_sauce: 0,
      reserved_family_night: 0,
      reserved_backyard_host: 0,
      reserved_freezer_filler: 0,
      capacity_enforced: true
    };

    mockSupabaseModule(
      buildMockClient({ data: dropRow, error: null }, { data: [], error: null })
    );

    const { fetchActiveDrop } = await import("../lib/drops");
    const result = await fetchActiveDrop();

    expect(result).not.toBeNull();
    expect(result!.capacityEnforced).toBe(true);
  });

  it("maps sauce and package capacity/soldOut fields into the DTO correctly", async () => {
    const dropRow: DropRow = {
      id: "d6",
      title: "Full Item Coverage Drop",
      status: "active",
      order_cutoff_at: null,
      capacity_pulled_pork: 200,
      capacity_brisket: 200,
      capacity_sauce: 150,
      capacity_family_night: 50,
      capacity_backyard_host: 30,
      capacity_freezer_filler: 20,
      reserved_pulled_pork: 10,
      reserved_brisket: 20,
      reserved_sauce: 150,
      reserved_family_night: 10,
      reserved_backyard_host: 30,
      reserved_freezer_filler: 5,
      capacity_enforced: true
    };

    mockSupabaseModule(
      buildMockClient({ data: dropRow, error: null }, { data: [], error: null })
    );

    const { fetchActiveDrop } = await import("../lib/drops");
    const result = await fetchActiveDrop();

    expect(result).not.toBeNull();
    expect(result!.capacity.sauce.total).toBe(150);
    expect(result!.capacity.sauce.reserved).toBe(150);
    expect(result!.capacity.familyNight.total).toBe(50);
    expect(result!.capacity.familyNight.reserved).toBe(10);
    expect(result!.capacity.backyardHost.total).toBe(30);
    expect(result!.capacity.backyardHost.reserved).toBe(30);
    expect(result!.capacity.freezerFiller.total).toBe(20);
    expect(result!.capacity.freezerFiller.reserved).toBe(5);
    // sauce is sold out (150 >= 150), familyNight is not (10 < 50)
    expect(result!.soldOut.sauce).toBe(true);
    expect(result!.soldOut.familyNight).toBe(false);
    // backyardHost is sold out (30 >= 30), freezerFiller is not (5 < 20)
    expect(result!.soldOut.backyardHost).toBe(true);
    expect(result!.soldOut.freezerFiller).toBe(false);
  });
});
