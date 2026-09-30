/**
 * Minimal GitHub REST "Contents API" client for the /admin page.
 * The token is supplied by the caller (kept only in the owner's localStorage).
 */
export class GitHubApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface RepoRef {
  owner: string;
  name: string;
  branch: string;
}

export interface FileInfo {
  sha: string;
  text: string;
  path: string;
}

export interface PutResult {
  contentSha: string;
  commitSha: string;
  commitUrl: string;
}

/** UTF-8 safe base64 (emoji, Devanagari, etc.). */
export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

const encPath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

export class GitHubContents {
  private token: string;
  repo: RepoRef;
  constructor(token: string, repo: RepoRef) {
    this.token = token;
    this.repo = repo;
  }

  private async req(method: string, path: string, body?: unknown): Promise<any> {
    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(this.repo.owner)}/${encodeURIComponent(this.repo.name)}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${this.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    if (res.ok) return res.status === 204 ? null : res.json();
    let detail = '';
    try {
      detail = (await res.json()).message ?? '';
    } catch {
      /* ignore */
    }
    const hints: Record<number, string> = {
      401: 'The token is invalid or expired.',
      403: 'The token is not allowed to do this. It needs "Contents: Read and write" on this repository.',
      404: 'Not found. Check REPO in src/config.ts and that the token has access to that repository.',
      409: 'Conflict: the file changed on GitHub since it was loaded.',
      422: 'GitHub rejected the change (usually the file changed since it was loaded).',
    };
    throw new GitHubApiError(res.status, `${hints[res.status] ?? `GitHub API error ${res.status}.`}${detail ? ` (${detail})` : ''}`);
  }

  /** Confirms the token can see the repo. Returns the repo's default branch. */
  async verify(): Promise<{ fullName: string; defaultBranch: string; private: boolean }> {
    const r = await this.req('GET', '');
    return { fullName: r.full_name, defaultBranch: r.default_branch, private: r.private };
  }

  /** Returns null when the file does not exist. */
  async getFile(path: string): Promise<FileInfo | null> {
    try {
      const r = await this.req('GET', `/contents/${encPath(path)}?ref=${encodeURIComponent(this.repo.branch)}&t=${Date.now()}`);
      if (Array.isArray(r)) throw new GitHubApiError(400, `${path} is a directory.`);
      return { sha: r.sha, text: fromBase64(r.content ?? ''), path };
    } catch (e) {
      if (e instanceof GitHubApiError && e.status === 404) return null;
      throw e;
    }
  }

  /** Lists the files in a folder (an empty list when the folder does not exist). */
  async listDir(path: string): Promise<{ name: string; path: string; sha: string }[]> {
    try {
      const r = await this.req('GET', `/contents/${encPath(path)}?ref=${encodeURIComponent(this.repo.branch)}&t=${Date.now()}`);
      if (!Array.isArray(r)) return [];
      return r.filter((x: any) => x.type === 'file').map((x: any) => ({ name: x.name, path: x.path, sha: x.sha }));
    } catch (e) {
      if (e instanceof GitHubApiError && e.status === 404) return [];
      throw e;
    }
  }

  /** Create (no sha) or update (sha of the version you edited) a file with one commit. */
  async putFile(path: string, text: string, message: string, sha?: string): Promise<PutResult> {
    const r = await this.req('PUT', `/contents/${encPath(path)}`, {
      message,
      content: toBase64(text),
      branch: this.repo.branch,
      ...(sha ? { sha } : {}),
    });
    return { contentSha: r.content.sha, commitSha: r.commit.sha, commitUrl: r.commit.html_url };
  }

  /**
   * Read-modify-write with optimistic concurrency: always applies `mutate` to the latest
   * version on GitHub, and on a 409/422 sha conflict re-reads and retries.
   */
  async updateText(
    path: string,
    mutate: (current: string | null) => string,
    message: string,
    attempts = 3,
  ): Promise<PutResult & { text: string }> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      const cur = await this.getFile(path);
      const next = mutate(cur?.text ?? null);
      try {
        const res = await this.putFile(path, next, message, cur?.sha);
        return { ...res, text: next };
      } catch (e) {
        lastErr = e;
        if (!(e instanceof GitHubApiError) || (e.status !== 409 && e.status !== 422)) throw e;
        await new Promise((r) => setTimeout(r, 400 * (i + 1)));
      }
    }
    throw lastErr;
  }
}
