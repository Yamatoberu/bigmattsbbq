import { command } from "./process.js";
import type { Issue, PullRequest } from "./types.js";

export const REPO = "Yamatoberu/bigmattsbbq";
export const IDENTITY = "BigMatt-Agents";

export interface GitHubPort {
  verify(): Promise<void>;
  issues(label: string): Promise<Issue[]>;
  issue(number: number): Promise<Issue>;
  pulls(): Promise<PullRequest[]>;
  comment(number: number, body: string): Promise<void>;
  label(number: number, label: string): Promise<void>;
  ownerAnswer(number: number, marker: string): Promise<{ body: string; url: string } | undefined>;
}

export class GitHub implements GitHubPort {
  async verify(): Promise<void> {
    if (await command("gh", ["api", "user", "--jq", ".login"]) !== IDENTITY) {
      throw new Error("GitHub identity must be BigMatt-Agents; dispatch stopped");
    }
    const repo = JSON.parse(await command("gh", ["api", `repos/${REPO}`]));
    if (!repo.permissions?.push || !repo.permissions?.pull) throw new Error("Missing repository read/write permissions");
  }

  private async gh(args: string[]): Promise<string> {
    await this.verify();
    return command("gh", args);
  }

  async issues(label: string): Promise<Issue[]> {
    return JSON.parse(await this.gh(["issue", "list", "--repo", REPO, "--state", "open", "--label", label,
      "--limit", "200", "--json", "number,title,body,url,state,createdAt,labels"]));
  }

  async issue(number: number): Promise<Issue> {
    return JSON.parse(await this.gh(["issue", "view", String(number), "--repo", REPO,
      "--json", "number,title,body,url,state,createdAt,labels"]));
  }

  async pulls(): Promise<PullRequest[]> {
    // All states prevent a crash after creation from causing a second PR, even if it was merged.
    return JSON.parse(await this.gh(["pr", "list", "--repo", REPO, "--state", "all", "--limit", "200",
      "--json", "number,url,state,headRefName,body"]));
  }

  async comment(number: number, body: string): Promise<void> {
    // stdin avoids shell expansion, temporary-file disclosure, and command-line size limits.
    await this.verify();
    await command("gh", ["issue", "comment", String(number), "--repo", REPO, "--body-file", "-"], { input: body });
  }

  async label(number: number, label: string): Promise<void> {
    await this.gh(["issue", "edit", String(number), "--repo", REPO, "--add-label", label]);
  }

  async ownerAnswer(number: number, marker: string): Promise<{ body: string; url: string } | undefined> {
    const pages = await this.gh(["api", "--paginate", "--slurp", `repos/${REPO}/issues/${number}/comments`]);
    const comments = JSON.parse(pages).flat() as { user: { login: string }; body: string; html_url: string }[];
    const answer = comments.filter(c => c.user.login === "Yamatoberu" && c.body.startsWith(`${marker}\n`)).at(-1);
    return answer ? { body: answer.body.slice(marker.length).trim(), url: answer.html_url } : undefined;
  }

  async verifyTransport(): Promise<void> {
    await this.verify();
    const credentials = await command("gh", ["auth", "git-credential", "get"], {
      input: "protocol=https\nhost=github.com\n\n"
    });
    const token = credentials.split("\n").find(l => l.startsWith("password="))?.slice(9);
    if (!token) throw new Error("Missing agent Git transport credentials");
    const login = await command("gh", ["api", "user", "--jq", ".login"], {
      env: { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: undefined }
    });
    if (login !== IDENTITY) throw new Error("Git transport identity must be BigMatt-Agents");
  }
}
