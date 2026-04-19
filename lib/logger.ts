export function logError(message: string, error: unknown, requestId?: string) {
  const normalized = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { error };
  console.error({ requestId, message, ...normalized });
}
