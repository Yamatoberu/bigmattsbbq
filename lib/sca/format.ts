export const EM_DASH = "—";

export function formatScoreValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }

  return Number(value.toFixed(2)).toString();
}

function nonEmpty(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function cookColumnLabel(
  competitionName: string | null | undefined,
  steakLabel: string | null | undefined
): string {
  const name = nonEmpty(competitionName);
  const label = nonEmpty(steakLabel);

  if (name && label) {
    return `${name} - ${label}`;
  }

  if (name) {
    return name;
  }

  if (label) {
    return label;
  }

  return "Untitled Cook";
}

export function formatEventDate(dateOnly: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).formatToParts(new Date(dateOnly));

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  return `${values.month} ${values.day}, ${values.year}`;
}

export function formatCookDate(isoTimestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver"
  }).formatToParts(new Date(isoTimestamp));

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  return `${values.month} ${values.day}, ${values.year}`;
}
