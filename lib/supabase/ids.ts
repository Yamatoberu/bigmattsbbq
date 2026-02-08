export function toNumberId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function requireNumberId(value: unknown, label = 'id'): number {
  const parsed = toNumberId(value);
  if (parsed === null) {
    throw new Error(`Invalid ${label}`);
  }
  return parsed;
}
