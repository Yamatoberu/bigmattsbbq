import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

interface MockResult {
  data: unknown;
  error: { code?: string; message?: string } | null;
}

let mockResult: MockResult = { data: null, error: null };
let lastCall: {
  table: string | null;
  select: string | null;
  order: [string, { ascending: boolean }] | null;
  eq: [string, unknown] | null;
  single: boolean;
} = { table: null, select: null, order: null, eq: null, single: false };

function resetCallRecorder() {
  lastCall = { table: null, select: null, order: null, eq: null, single: false };
}

const mockClient = {
  from(table: string) {
    lastCall.table = table;
    const chain = {
      select(selectArg: string) {
        lastCall.select = selectArg;
        return chain;
      },
      order(column: string, opts: { ascending: boolean }) {
        lastCall.order = [column, opts];
        return Promise.resolve(mockResult);
      },
      eq(column: string, value: unknown) {
        lastCall.eq = [column, value];
        return chain;
      },
      single() {
        lastCall.single = true;
        return Promise.resolve(mockResult);
      },
      then(
        onFulfilled: (value: MockResult) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        return Promise.resolve(mockResult).then(onFulfilled, onRejected);
      }
    };
    return chain;
  }
};

vi.mock("../lib/supabase-sca", () => ({
  getScaSupabaseClient: () => mockClient
}));

beforeEach(() => {
  resetCallRecorder();
  mockResult = { data: null, error: null };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("parseScaId", () => {
  it("accepts a plain numeric string", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId("12")).toBe(12);
  });

  it("accepts a numeric string with surrounding whitespace after trimming", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId(" 12 ")).toBe(12);
  });

  it("rejects zero", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId("0")).toBeNull();
  });

  it("rejects negative numbers", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId("-1")).toBeNull();
  });

  it("rejects fractional values", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId("1.5")).toBeNull();
  });

  it("rejects exponential notation", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId("1e3")).toBeNull();
  });

  it("rejects non-numeric strings", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId("abc")).toBeNull();
  });

  it("rejects an empty string", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId("")).toBeNull();
  });

  it("rejects undefined", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId(undefined)).toBeNull();
  });

  it("rejects arrays", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId(["1", "2"])).toBeNull();
  });

  it("rejects SQL-injection-shaped input", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId("1; DROP TABLE cook")).toBeNull();
  });

  it("rejects values exceeding Number.isSafeInteger", async () => {
    const { parseScaId } = await import("../lib/sca/queries");
    expect(parseScaId("99999999999999999999")).toBeNull();
  });
});

describe("getAllCooksWithScores", () => {
  it("passes a select string containing score(*) and competition:competition_id", async () => {
    mockResult = { data: [], error: null };
    const { getAllCooksWithScores } = await import("../lib/sca/queries");
    await getAllCooksWithScores();
    expect(lastCall.select).toContain("score(*)");
    expect(lastCall.select).toContain("competition:competition_id");
  });

  it("returns [] when the client resolves { data: null, error: null }", async () => {
    mockResult = { data: null, error: null };
    const { getAllCooksWithScores } = await import("../lib/sca/queries");
    const result = await getAllCooksWithScores();
    expect(result).toEqual([]);
  });

  it("rejects when the client resolves a non-null error", async () => {
    mockResult = { data: null, error: { message: "boom" } };
    const { getAllCooksWithScores } = await import("../lib/sca/queries");
    await expect(getAllCooksWithScores()).rejects.toBeTruthy();
  });
});

describe("getCompetitions", () => {
  it("calls .order with event_date and { ascending: false }", async () => {
    mockResult = { data: [], error: null };
    const { getCompetitions } = await import("../lib/sca/queries");
    await getCompetitions();
    expect(lastCall.order).toEqual(["event_date", { ascending: false }]);
  });

  it("returns [] when the client resolves { data: null, error: null }", async () => {
    mockResult = { data: null, error: null };
    const { getCompetitions } = await import("../lib/sca/queries");
    const result = await getCompetitions();
    expect(result).toEqual([]);
  });

  it("rejects when the client resolves a non-PGRST116 error", async () => {
    mockResult = { data: null, error: { code: "500", message: "boom" } };
    const { getCompetitions } = await import("../lib/sca/queries");
    await expect(getCompetitions()).rejects.toBeTruthy();
  });
});

describe("getCompetitionWithCooks", () => {
  it("resolves to null for a PGRST116 error", async () => {
    mockResult = { data: null, error: { code: "PGRST116" } };
    const { getCompetitionWithCooks } = await import("../lib/sca/queries");
    const result = await getCompetitionWithCooks(4);
    expect(result).toBeNull();
  });

  it("rejects for a non-PGRST116 error", async () => {
    mockResult = { data: null, error: { code: "500", message: "boom" } };
    const { getCompetitionWithCooks } = await import("../lib/sca/queries");
    await expect(getCompetitionWithCooks(4)).rejects.toBeTruthy();
  });

  it("returns the row on success", async () => {
    const row = { id: 4, name: "BBQ Pit Stop St George", cook: [] };
    mockResult = { data: row, error: null };
    const { getCompetitionWithCooks } = await import("../lib/sca/queries");
    const result = await getCompetitionWithCooks(4);
    expect(result).toEqual(row);
  });
});

describe("getCookWithDetails", () => {
  it("resolves to null on PGRST116", async () => {
    mockResult = { data: null, error: { code: "PGRST116" } };
    const { getCookWithDetails } = await import("../lib/sca/queries");
    const result = await getCookWithDetails(1);
    expect(result).toBeNull();
  });

  it("rethrows any other error code", async () => {
    mockResult = { data: null, error: { code: "500", message: "boom" } };
    const { getCookWithDetails } = await import("../lib/sca/queries");
    await expect(getCookWithDetails(1)).rejects.toBeTruthy();
  });

  it("normalizes a cook_ai_review: null embed to []", async () => {
    mockResult = {
      data: {
        id: 19,
        steak_label: "A",
        competition: null,
        score: null,
        cook_detail: null,
        cook_ai_review: null
      },
      error: null
    };
    const { getCookWithDetails } = await import("../lib/sca/queries");
    const result = await getCookWithDetails(19);
    expect(result?.cook_ai_review).toEqual([]);
  });
});
