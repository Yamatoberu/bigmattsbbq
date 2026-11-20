export type Status = "queued" | "active" | "interrupted" | "usage_paused" |
  "waiting_technical" | "waiting_business" | "failed" | "awaiting_review" | "completed";

export type ErrorKind = "usage" | "authentication" | "network" | "permission" |
  "session" | "coding" | "approval" | "unknown";

export interface Execution {
  id: string;
  issue: number;
  issue_url: string;
  branch: string;
  worktree: string;
  unit: string;
  status: Status;
  session: string | null;
  progress: string;
  heartbeat: number | null;
  started: number;
  updated: number;
  retries: number;
  retry_at: number | null;
  error_kind: ErrorKind | null;
  blocker: string | null;
  question: string | null;
  answer: string | null;
  pr: number | null;
  pr_url: string | null;
}

export interface Issue {
  number: number;
  title: string;
  body: string;
  url: string;
  state: string;
  createdAt: string;
  labels: { name: string }[];
}

export interface PullRequest { number: number; url: string; state: string; headRefName: string; body?: string }

export interface Question {
  kind: "technical" | "business";
  question: string;
  missingDocumentation: string;
  options: string[];
  recommendation: string;
  impact: string;
}

export interface Result {
  outcome: "ready" | "question" | "blocked";
  summary: string;
  acceptanceEvidence: string[];
  question: Question | null;
}

export interface Config {
  repository: string;
  stateDirectory: string;
  codexHome: string;
  codexBinary: string;
  toolchainDirectory: string;
  approvedSecurityIssues: number[];
  readyLabel: string;
  blockedLabel: string;
  ownerLabel: string;
  maxRetries: number;
  leaseMs: number;
  enabled: boolean;
  integrationVerified: boolean;
}
