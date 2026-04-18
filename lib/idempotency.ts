import { createHash } from "crypto";

export function newIdempotencyKey(inputs: string[]): string {
  return createHash("sha256")
    .update([...inputs].sort().join("|"))
    .digest("hex")
    .slice(0, 45);
}
