export function logError(message: string, error: unknown, requestId?: string) {
  const normalized = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { error };
  const extra: { status?: unknown; body?: string } = {};
  if (error !== null && typeof error === "object") {
    if ("status" in error) extra.status = (error as { status: unknown }).status;
    if ("body" in error) extra.body = JSON.stringify((error as { body: unknown }).body);
  }
  console.error({ requestId, message, ...normalized, ...extra });
}
