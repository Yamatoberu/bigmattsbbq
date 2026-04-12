export function formatMoney(amountCents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(amountCents / 100);
}

export function formatDenverDateTime(isoDate: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Denver"
  }).formatToParts(new Date(isoDate));

  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));

  return `${values.month} ${values.day}, ${values.year} at ${values.hour}:${values.minute} ${values.dayPeriod}`;
}
