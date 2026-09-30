/**
 * Browser-side live profile fetching for GitHub + LeetCode.
 * - Caches in localStorage (1h for GitHub/solved counts, 6h for contest + badges) to stay
 *   under GitHub's 60 req/h anonymous limit and to spare the free LeetCode proxies.
 * - On rate-limit / network failure, falls back to the last cached copy (even if stale),
 *   and finally to the static snapshot in src/data/profiles.ts.
 * - All rendering goes through src/lib/stat-views.ts, the same builders the pages use at
 *   build time, and calls refreshMotion() so injected charts draw in.
 */
import { LEETCODE_FALLBACK } from '../data/profiles';
import { refreshMotion } from '../scripts/motion';
import { contestLineHtml, esc, langDonutHtml, lcMetersHtml, lcRingHtml, perYearHtml, statTile, type ContestPoint } from './stat-views';

const CACHE_MS = 60 * 60 * 1000;
const LONG_CACHE_MS = 6 * CACHE_MS;

interface Cached<T> {
  ts: number;
  data: T;
}

function readCache<T>(key: string): Cached<T> | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Cached<T>) : null;
  } catch {
    return null;
  }
}
function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* storage full / disabled — ignore */
  }
}

export function ago(input: string | number): string {
  const t = typeof input === 'number' ? input : Date.parse(input);
  const s = Math.max(0, (Date.now() - t) / 1000);
  const units: [number, string][] = [
    [31536000, 'year'],
    [2592000, 'month'],
    [86400, 'day'],
    [3600, 'hour'],
    [60, 'minute'],
  ];
  for (const [sec, name] of units) {
    const v = Math.floor(s / sec);
    if (v >= 1) return `${v} ${name}${v > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

async function fetchJson(url: string, timeoutMs: number, init: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function setUpdated(id: string, ts: number, stale = false) {
  const el = document.getElementById(id);
  if (el) el.textContent = `${stale ? 'cached' : 'updated'} ${ago(ts)}`;
}

function inject(el: HTMLElement, html: string) {
  el.innerHTML = html;
  el.setAttribute('aria-busy', 'false');
  refreshMotion(el);
}

/* =========================== GitHub =========================== */

interface GhUser {
  login: string;
  avatar_url: string;
  name: string | null;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  html_url: string;
}
export interface GhRepo {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
  created_at: string;
  topics?: string[];
  homepage?: string | null;
}
export interface GhData {
  user: GhUser;
  repos: GhRepo[];
}

class HttpError extends Error {
  status: number;
  resetAt?: number;
  constructor(status: number, resetAt?: number) {
    super(`HTTP ${status}`);
    this.status = status;
    this.resetAt = resetAt;
  }
}

async function ghGet<T>(path: string): Promise<T> {
  const res = await fetchJson(`https://api.github.com${path}`, 15000, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) {
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    throw new HttpError(res.status, reset ? reset * 1000 : undefined);
  }
  return res.json() as Promise<T>;
}

export interface GhResult {
  data?: GhData;
  ts?: number;
  /** true when served from an expired cache because the live call failed */
  stale: boolean;
  /** human-readable (HTML-safe) error, when the live call failed */
  error?: string;
}

const inflight = new Map<string, Promise<GhResult>>();

/**
 * Cached + de-duplicated GitHub user/repos fetch. Shared by the Profiles page, the
 * Journey timeline, the projects grid and the command palette, so one page view costs at
 * most 2 API calls per hour.
 */
export function getGitHubData(username: string): Promise<GhResult> {
  const key = `gh:${username.toLowerCase()}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const p = (async (): Promise<GhResult> => {
    const cached = readCache<GhData>(key);
    if (cached && Date.now() - cached.ts < CACHE_MS && Array.isArray(cached.data?.repos)) {
      return { data: cached.data, ts: cached.ts, stale: false };
    }
    try {
      const u = encodeURIComponent(username);
      const [user, repos] = await Promise.all([
        ghGet<GhUser>(`/users/${u}`),
        ghGet<GhRepo[]>(`/users/${u}/repos?per_page=100&sort=pushed`),
      ]);
      // Keep only the fields we use, so the cache stays small.
      const slim: GhRepo[] = repos.map((r) => ({
        name: r.name,
        html_url: r.html_url,
        description: r.description,
        language: r.language,
        stargazers_count: r.stargazers_count,
        forks_count: r.forks_count,
        fork: r.fork,
        archived: r.archived,
        pushed_at: r.pushed_at,
        created_at: r.created_at,
        topics: r.topics ?? [],
        homepage: r.homepage,
      }));
      const data: GhData = { user, repos: slim };
      writeCache(key, data);
      return { data, ts: Date.now(), stale: false };
    } catch (err) {
      const e = err as HttpError;
      let msg: string;
      if (e.status === 403 || e.status === 429) {
        const when = e.resetAt ? ` It resets around ${new Date(e.resetAt).toLocaleTimeString()}.` : '';
        msg = `GitHub's hourly limit for anonymous requests has been reached from your network.${when}`;
      } else if (e.status === 404) {
        msg = `GitHub user “${esc(username)}” was not found — check <code>GITHUB_USERNAME</code> in <code>src/config.ts</code>.`;
      } else {
        msg = 'Could not reach the GitHub API right now.';
      }
      return cached ? { data: cached.data, ts: cached.ts, stale: true, error: msg } : { stale: true, error: msg };
    }
  })();
  inflight.set(key, p);
  return p;
}

/** Repos worth showing publicly: no profile-README repo (named after the user). */
export const publicRepos = (d: GhData) => d.repos.filter((r) => r.name.toLowerCase() !== d.user.login.toLowerCase());

function repoLi(r: GhRepo, meta: string) {
  return `<li><span><a href="${esc(r.html_url)}" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a>${r.description ? `<br><span class="muted repo-desc">${esc(r.description)}</span>` : ''}</span><span class="meta">${meta}</span></li>`;
}

function renderGitHub(body: HTMLElement, d: GhData, note = '') {
  const repos = publicRepos(d);
  const own = repos.filter((r) => !r.fork);
  const stars = own.reduce((s, r) => s + r.stargazers_count, 0);
  const forks = own.reduce((s, r) => s + r.forks_count, 0);
  const top = [...own].sort((a, b) => b.stargazers_count - a.stargazers_count || Date.parse(b.pushed_at) - Date.parse(a.pushed_at)).slice(0, 6);
  const recent = [...repos].sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at)).slice(0, 5);
  const lastPush = recent[0] ? ago(recent[0].pushed_at) : '—';

  inject(
    body,
    `${note}
    <dl class="scores">
      ${statTile(d.user.public_repos, 'public repos')}
      ${statTile(stars, 'stars on my repos')}
      ${statTile(d.user.followers, 'followers')}
      ${statTile(forks, 'forks of my repos')}
      ${statTile(lastPush, 'last push')}
      ${statTile(String(new Date(d.user.created_at).getFullYear()), 'on GitHub since')}
    </dl>
    <div class="chart-grid">
      <div class="chart-card">
        <h4>Languages <span class="muted h-note">(main language, by repo count)</span></h4>
        ${langDonutHtml(repos)}
      </div>
      <div class="chart-card">
        <div class="chart-head">
          <h4>Per year</h4>
          <div class="seg" role="group" aria-label="Metric">
            <button type="button" class="chip" data-metric="repos" aria-pressed="true">Repos</button>
            <button type="button" class="chip" data-metric="stars" aria-pressed="false">Stars</button>
          </div>
        </div>
        <div data-per-year>${perYearHtml(repos, 'repos')}</div>
      </div>
    </div>
    <div class="two-col">
      <div>
        <h4>Top repositories</h4>
        ${top.length ? `<ul class="repo-list">${top.map((r) => repoLi(r, `★ ${r.stargazers_count}${r.language ? ' · ' + esc(r.language) : ''}`)).join('')}</ul>` : '<p class="muted">No public repositories yet.</p>'}
      </div>
      <div>
        <h4>Recent activity</h4>
        ${recent.length ? `<ul class="repo-list">${recent.map((r) => repoLi(r, `pushed ${ago(r.pushed_at)}`)).join('')}</ul>` : '<p class="muted">Nothing yet.</p>'}
      </div>
    </div>`,
  );

  const holder = body.querySelector<HTMLElement>('[data-per-year]')!;
  body.querySelectorAll<HTMLButtonElement>('[data-metric]').forEach((b) =>
    b.addEventListener('click', () => {
      body.querySelectorAll('[data-metric]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      holder.innerHTML = perYearHtml(repos, b.dataset.metric as 'repos' | 'stars');
      refreshMotion(holder);
    }),
  );
}

export async function loadGitHub(username: string) {
  const body = document.getElementById('gh-body');
  if (!body) return;
  const r = await getGitHubData(username);
  if (r.data && r.ts) {
    const note = r.error ? `<p class="panel-note warn">${r.error} Showing cached data from ${ago(r.ts)}.</p>` : '';
    renderGitHub(body, r.data, note);
    setUpdated('gh-updated', r.ts, r.stale);
  } else {
    inject(body, `<p class="panel-note err">${r.error} <a href="https://github.com/${esc(username)}" target="_blank" rel="noopener noreferrer">Open profile on GitHub ↗</a></p>`);
  }
}

/* =========================== LeetCode =========================== */
/* LeetCode's own GraphQL API has no CORS headers, so we race several public proxies. */

export interface LcStats {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  totalQuestions?: number;
  totalEasy?: number;
  totalMedium?: number;
  totalHard?: number;
  acceptance?: number;
  ranking?: number;
  source: string;
}

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(+v) ? +v : undefined);

const LC_TIMEOUT = 35000; // onrender free instances can take ~30s to cold start
const ALFA = 'https://alfa-leetcode-api.onrender.com';

async function getJson(url: string): Promise<any> {
  const res = await fetchJson(url, LC_TIMEOUT);
  if (!res.ok) throw new HttpError(res.status);
  return res.json();
}

const providers: { name: string; load: (u: string) => Promise<LcStats> }[] = [
  {
    name: 'alfa-leetcode-api',
    async load(u) {
      const base = `${ALFA}/${u}`;
      const [solved, profile] = await Promise.all([getJson(`${base}/solved`), getJson(base).catch(() => null)]);
      const total = num(solved?.solvedProblem);
      if (total === undefined || solved?.errors) throw new Error('bad payload');
      const all = (arr: any[] | undefined) => arr?.find((x) => x.difficulty === 'All');
      const acc = all(solved.acSubmissionNum)?.submissions;
      const sub = all(solved.totalSubmissionNum)?.submissions;
      return {
        total,
        easy: num(solved.easySolved) ?? 0,
        medium: num(solved.mediumSolved) ?? 0,
        hard: num(solved.hardSolved) ?? 0,
        acceptance: acc && sub ? (acc / sub) * 100 : undefined,
        ranking: num(profile?.ranking),
        source: 'alfa-leetcode-api',
      };
    },
  },
  {
    name: 'leetcode-api-faisalshohag',
    async load(u) {
      const d = await getJson(`https://leetcode-api-faisalshohag.vercel.app/${u}`);
      const total = num(d?.totalSolved);
      if (total === undefined || d?.errors) throw new Error('bad payload');
      return {
        total,
        easy: num(d.easySolved) ?? 0,
        medium: num(d.mediumSolved) ?? 0,
        hard: num(d.hardSolved) ?? 0,
        totalQuestions: num(d.totalQuestions),
        totalEasy: num(d.totalEasy),
        totalMedium: num(d.totalMedium),
        totalHard: num(d.totalHard),
        ranking: num(d.ranking),
        source: 'leetcode-api-faisalshohag',
      };
    },
  },
];

export const LC_SNAPSHOT: LcStats = {
  total: LEETCODE_FALLBACK.solved,
  easy: LEETCODE_FALLBACK.easy,
  medium: LEETCODE_FALLBACK.medium,
  hard: LEETCODE_FALLBACK.hard,
  source: `snapshot (${LEETCODE_FALLBACK.asOf})`,
};

type LcListener = (s: LcStats, meta: { ts: number; stale: boolean; error?: string; final: boolean }) => void;

const lcInflight = new Map<string, Promise<{ s: LcStats; meta: Parameters<LcListener>[1] }[]>>();

/**
 * Solved counts. Calls `onData` with the first live answer (or a fresh cache), then once more
 * with fields merged from every proxy that answered. On total failure: stale cache, then the
 * static snapshot. Concurrent callers share one set of requests.
 */
export async function getLeetCodeStats(username: string, onData: LcListener): Promise<void> {
  const key = `lc:${username.toLowerCase()}`;
  const cached = readCache<LcStats>(key);
  if (cached && Date.now() - cached.ts < CACHE_MS) {
    onData(cached.data, { ts: cached.ts, stale: false, final: true });
    return;
  }
  let shared = lcInflight.get(key);
  if (!shared) {
    const u = encodeURIComponent(username);
    const calls = providers.map((p) => p.load(u));
    const firstP = Promise.any(calls);
    shared = (async () => {
      try {
        const first = await firstP;
        writeCache(key, first);
        const settled = await Promise.allSettled(calls);
        const ok = settled.flatMap((s) => (s.status === 'fulfilled' ? [s.value] : []));
        const merged: LcStats = { ...first };
        for (const s of ok) {
          for (const k of Object.keys(s) as (keyof LcStats)[]) {
            if (merged[k] === undefined && s[k] !== undefined) (merged as any)[k] = s[k];
          }
        }
        merged.source = ok.map((s) => s.source).join(' + ');
        writeCache(key, merged);
        return [{ s: merged, meta: { ts: Date.now(), stale: false, final: true } }];
      } catch {
        const error = 'The public LeetCode proxies are unavailable or slow right now (they run on free hosting).';
        return [cached ? { s: cached.data, meta: { ts: cached.ts, stale: true, error, final: true } } : { s: LC_SNAPSHOT, meta: { ts: 0, stale: true, error, final: true } }];
      }
    })();
    lcInflight.set(key, shared);
    // Render the first valid answer immediately (Promise.any ignores individual failures).
    firstP.then((first) => onData(first, { ts: Date.now(), stale: false, final: false })).catch(() => {});
  }
  const out = await shared;
  for (const o of out) onData(o.s, o.meta);
}

function renderLeetCode(body: HTMLElement, s: LcStats, note = '') {
  const of = (t?: number) => (t ? ` of ${t.toLocaleString('en-IN')}` : '');
  inject(
    body,
    `${note}
    <div class="lc-grid">
      <div class="chart-card">${lcRingHtml(s)}</div>
      <div>
        <dl class="scores">
          ${statTile(s.easy, `easy${of(s.totalEasy)}`)}
          ${statTile(s.medium, `medium${of(s.totalMedium)}`)}
          ${statTile(s.hard, `hard${of(s.totalHard)}`)}
          ${s.acceptance !== undefined ? statTile(+s.acceptance.toFixed(1), 'acceptance rate', { decimals: 1, suffix: '%' }) : ''}
          ${s.ranking ? statTile(s.ranking, 'global ranking') : ''}
        </dl>
        <p class="muted src-note">Source: ${esc(s.source)}${s.source.startsWith('snapshot') ? '' : ' (unofficial proxy)'}</p>
      </div>
    </div>
    <div class="two-col">
      <div>
        <h4>Languages <span class="muted h-note">(problems accepted, ${esc(LEETCODE_FALLBACK.asOf)})</span></h4>
        ${lcMetersHtml(LEETCODE_FALLBACK.languages, 'Problems solved per language')}
      </div>
      <div>
        <h4>Top topics <span class="muted h-note">(problems per tag, ${esc(LEETCODE_FALLBACK.asOf)})</span></h4>
        ${lcMetersHtml(LEETCODE_FALLBACK.topTags, 'Problems solved per topic tag')}
      </div>
    </div>`,
  );
}

export function loadLeetCode(username: string) {
  const body = document.getElementById('lc-body');
  if (!body) return;
  return getLeetCodeStats(username, (s, m) => {
    const note = m.error
      ? `<p class="panel-note warn">${m.error} ${m.ts ? `Showing cached data from ${ago(m.ts)}.` : `Showing a ${esc(LEETCODE_FALLBACK.asOf)} snapshot.`} <a href="https://leetcode.com/u/${esc(username)}/" target="_blank" rel="noopener noreferrer">Open LeetCode ↗</a></p>`
      : '';
    renderLeetCode(body, s, note);
    if (m.ts) setUpdated('lc-updated', m.ts, m.stale);
  });
}

/* ------------------------- contest history + badges ------------------------- */

interface ContestData {
  attended: number;
  rating: number;
  globalRanking?: number;
  topPercentage?: number;
  badge?: string;
  history: ContestPoint[];
}

async function cachedAlfa<T>(key: string, url: string, parse: (d: any) => T): Promise<{ data: T; ts: number } | null> {
  const cached = readCache<T>(key);
  if (cached && Date.now() - cached.ts < LONG_CACHE_MS) return cached;
  try {
    const data = parse(await getJson(url));
    writeCache(key, data);
    return { data, ts: Date.now() };
  } catch {
    return cached ?? null;
  }
}

export function getContest(username: string) {
  const u = encodeURIComponent(username);
  return cachedAlfa<ContestData>(`lc-contest:${username.toLowerCase()}`, `${ALFA}/${u}/contest`, (d) => {
    const hist = Array.isArray(d?.contestParticipation) ? d.contestParticipation : null;
    if (!hist) throw new Error('bad payload');
    const history: ContestPoint[] = hist
      .filter((c: any) => c?.attended && num(c.rating) !== undefined && num(c.contest?.startTime) !== undefined)
      .map((c: any) => ({
        title: String(c.contest?.title ?? 'Contest'),
        startTime: num(c.contest.startTime)!,
        rating: Math.round(num(c.rating)!),
        ranking: num(c.ranking) ?? 0,
        problemsSolved: num(c.problemsSolved),
        totalProblems: num(c.totalProblems),
      }));
    return {
      attended: num(d.contestAttend) ?? history.length,
      rating: Math.round(num(d.contestRating) ?? history.at(-1)?.rating ?? 0),
      globalRanking: num(d.contestGlobalRanking),
      topPercentage: num(d.contestTopPercentage),
      badge: d.contestBadges?.name ?? undefined,
      history,
    };
  });
}

/** Contest card: summary tiles + rating line. The whole card hides when there's no data. */
export async function loadContest(username: string, card: HTMLElement) {
  const body = card.querySelector<HTMLElement>('[data-body]')!;
  const r = await getContest(username);
  if (!r || r.data.history.length < 2) {
    card.hidden = true;
    return;
  }
  const d = r.data;
  const peak = d.history.reduce((a, b) => (b.rating > a.rating ? b : a));
  const ranked = d.history.filter((h) => h.ranking > 0);
  const best = ranked.length ? ranked.reduce((a, b) => (b.ranking < a.ranking ? b : a)) : null;
  inject(
    body,
    `<dl class="scores">
      ${statTile(d.rating, 'current rating')}
      ${statTile(peak.rating, 'peak rating')}
      ${statTile(d.attended, 'contests')}
      ${d.topPercentage !== undefined ? statTile(+d.topPercentage.toFixed(2), 'of all rated users', { decimals: 2, prefix: 'top ', suffix: '%' }) : ''}
      ${best ? statTile(best.ranking, 'best rank') : ''}
      ${d.badge ? statTile(d.badge, 'contest badge') : ''}
    </dl>
    ${contestLineHtml(d.history)}`,
  );
  const u = document.getElementById('contest-updated');
  if (u) u.textContent = `updated ${ago(r.ts)}`;
  wireLineHover(body);
}

export async function loadBadges(username: string, card: HTMLElement) {
  const body = card.querySelector<HTMLElement>('[data-body]')!;
  const u = encodeURIComponent(username);
  const r = await cachedAlfa<{ id: string; name: string; icon: string; date?: string }[]>(`lc-badges:${username.toLowerCase()}`, `${ALFA}/${u}/badges`, (d) => {
    if (!Array.isArray(d?.badges)) throw new Error('bad payload');
    return d.badges.map((b: any) => ({
      id: String(b.id),
      name: String(b.displayName ?? 'Badge'),
      icon: String(b.icon ?? '').startsWith('/') ? `https://leetcode.com${b.icon}` : String(b.icon ?? ''),
      date: b.creationDate ? String(b.creationDate) : undefined,
    }));
  });
  if (!r || !r.data.length) {
    card.hidden = true;
    return;
  }
  const fmtDate = (s?: string) => {
    const t = s ? Date.parse(s) : NaN;
    return Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '';
  };
  inject(
    body,
    `<ul class="patches">${r.data
      .map(
        (b) =>
          `<li class="patch"><img src="${esc(b.icon)}" alt="" width="64" height="64" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"><span class="b-name">${esc(b.name)}</span>${b.date ? `<span class="b-date muted">${esc(fmtDate(b.date))}</span>` : ''}</li>`,
      )
      .join('')}</ul>`,
  );
  const cnt = document.getElementById('badges-count');
  if (cnt) cnt.textContent = `${r.data.length} badges`;
}

/** Crosshair for line charts (hit rects carry data-cx / data-cy); the text tooltip is global (motion.ts). */
export function wireLineHover(root: HTMLElement) {
  root.querySelectorAll<SVGSVGElement>('.line-chart svg').forEach((svg) => {
    const xh = svg.querySelector<SVGLineElement>('.xhair');
    const dot = svg.querySelector<SVGCircleElement>('.xdot');
    const fig = svg.closest('figure')!;
    if (!xh || !dot) return;
    svg.addEventListener('pointermove', (e) => {
      const hit = (e.target as Element).closest<SVGRectElement>('.hit');
      if (!hit) return fig.classList.remove('hovering');
      const { cx = '0', cy = '0' } = hit.dataset;
      xh.setAttribute('x1', cx);
      xh.setAttribute('x2', cx);
      dot.setAttribute('cx', cx);
      dot.setAttribute('cy', cy);
      fig.classList.add('hovering');
    });
    svg.addEventListener('pointerleave', () => fig.classList.remove('hovering'));
  });
}
