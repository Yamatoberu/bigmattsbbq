export function formatWindow(startIso?: string | null, endIso?: string | null) {
  if (!startIso || !endIso) return 'Pickup window TBA';
  const start = new Date(startIso);
  const end = new Date(endIso);
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function poundsFromBags(bags: number, bagSize = 0.5) {
  return Number((bags * bagSize).toFixed(1));
}

export function safeNumber(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
