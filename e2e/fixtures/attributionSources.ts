import { AttributionSourceDTO } from "../../lib/types";

export const attributionSourcesFixture: AttributionSourceDTO[] = [
  { id: 1, code: "referral", label: "Friend, family, or coworker", requiresDetail: false, sortOrder: 10 },
  { id: 2, code: "facebook", label: "Facebook", requiresDetail: false, sortOrder: 20 },
  { id: 5, code: "ai", label: "ChatGPT or another AI", requiresDetail: true, sortOrder: 50 },
  { id: 8, code: "other", label: "Other", requiresDetail: true, sortOrder: 80 }
];
