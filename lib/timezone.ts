export const PICKUP_TIME_ZONE = "America/Denver";

function offsetAt(instant: number, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const parts = formatter.formatToParts(new Date(instant));
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  return asUtc - instant;
}

export function zonedNoonToUtcISO(date: string, timeZone: string): string {
  const [year, month, day] = date.split("-").map(Number);

  if (![year, month, day].every((value) => Number.isFinite(value))) {
    throw new Error(`zonedNoonToUtcISO: invalid date input "${date}"`);
  }

  const target = Date.UTC(year, month - 1, day, 12, 0, 0);

  let instant = target - offsetAt(target, timeZone);
  instant = target - offsetAt(instant, timeZone);

  return new Date(instant).toISOString();
}
