import { SquareError } from "./square";

export function logInfo(message: string, data?: Record<string, unknown>) {
  console.log({ message, ...data });
}

export function logError(message: string, error: unknown, requestId?: string) {
  let normalized: Record<string, unknown>;
  if (error instanceof SquareError) {
    normalized = { name: error.name, errorMessage: error.message, stack: error.stack, status: error.status, body: error.body };
  } else if (error instanceof Error) {
    normalized = { name: error.name, errorMessage: error.message, stack: error.stack };
  } else {
    normalized = { error };
  }
  console.error({ requestId, message, ...normalized });
}
