/**
 * Build-safe HTML builders for the stats UI (used by .astro pages at build time AND by the
 * browser after live API calls), so the static fallback and the live view look identical.
 */
import { barChart, fmtNum, lineChart, meterRows, ringChart, OTHER, SERIES, type Segment } from './charts';

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** One report-card cell: the figure in mono, the subject underneath. Static (no count-up). */
export function statTile(value: number | string, label: string, o: { decimals?: number; prefix?: string; suffix?: string; key?: string } = {}) {
  const isNum = typeof value === 'number' && Number.isFinite(value);
  const shown = isNum ? `${o.prefix ?? ''}${o.decimals ? (value as number).toFixed(o.decimals) : fmtNum(value as number)}${o.suffix ?? ''}` : String(value);
  return `<div class="score"${o.key ? ` data-key="${esc(o.key)}"` : ''}><dt class="score-l">${esc(label)}</dt><dd class="score-v">${esc(shown)}</dd></div>`;
}

/* ------------------------------ LeetCode ------------------------------ */

export interface LcSolved {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  totalEasy?: number;
  totalMedium?: number;
  totalHard?: number;
}

export const DIFF_COLORS = { easy: 'var(--diff-easy)', medium: 'var(--diff-medium)', hard: 'var(--diff-hard)' };

export function lcRingHtml(s: LcSolved) {
  const seg: Segment[] = [
    { label: 'Easy', value: s.easy, color: DIFF_COLORS.easy },
    { label: 'Medium', value: s.medium, color: DIFF_COLORS.medium },
    { label: 'Hard', value: s.hard, color: DIFF_COLORS.hard },
  ];
  return ringChart({ segments: seg, centerValue: fmtNum(s.total), countTo: s.total, centerLabel: 'solved', title: 'LeetCode problems solved by difficulty', showPct: true, thickness: 9 });
}

export function lcMetersHtml(rows: [string, number][], title: string) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return meterRows(
    rows.map(([label, value]) => ({ label, value, max })),
    title,
  );
}

export interface ContestPoint {
  title: string;
  startTime: number; // unix seconds
  rating: number;
  ranking: number;
  problemsSolved?: number;
  totalProblems?: number;
}

export function contestLineHtml(points: ContestPoint[]) {
  const monthYear = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return lineChart({
    title: 'LeetCode contest rating over time',
    yLabel: 'rating',
    points: points.map((p) => ({
      x: p.startTime * 1000,
      y: p.rating,
      label: `${p.title} (${monthYear.format(new Date(p.startTime * 1000))})`,
      sub: `rank ${fmtNum(p.ranking)}${p.totalProblems ? ` · ${p.problemsSolved ?? 0}/${p.totalProblems} solved` : ''}`,
    })),
  });
}

/* ------------------------------ GitHub ------------------------------ */

export interface RepoStatLike {
  name: string;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  created_at: string;
}

/** Language donut: top 6 languages by repo count, the rest folded into "Other" (never a 9th hue). */
export function langDonutHtml(repos: RepoStatLike[]) {
  const counts = new Map<string, number>();
  for (const r of repos) if (!r.fork && r.language) counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  const langs = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!langs.length) return '<p class="muted">No language data yet.</p>';
  const top = langs.slice(0, 6);
  const other = langs.slice(6).reduce((s, [, n]) => s + n, 0);
  const seg: Segment[] = top.map(([label, value], i) => ({ label, value, color: SERIES(i) }));
  if (other) seg.push({ label: 'Other', value: other, color: OTHER });
  const total = langs.reduce((s, [, n]) => s + n, 0);
  return ringChart({ segments: seg, centerValue: String(total), countTo: total, centerLabel: 'repos with a language', title: 'Main language of my public repositories', showPct: true, thickness: 12 });
}

/** Repos created per year and stars those repos hold, as two separate single-axis charts. */
export function perYearHtml(repos: RepoStatLike[], metric: 'repos' | 'stars') {
  const own = repos.filter((r) => !r.fork);
  if (!own.length) return '';
  const byYear = new Map<number, { repos: number; stars: number }>();
  for (const r of own) {
    const y = new Date(r.created_at).getUTCFullYear();
    const cur = byYear.get(y) ?? { repos: 0, stars: 0 };
    cur.repos++;
    cur.stars += r.stargazers_count;
    byYear.set(y, cur);
  }
  const years = [...byYear.keys()];
  const data = [];
  for (let y = Math.min(...years); y <= Math.max(...years); y++) {
    const v = byYear.get(y) ?? { repos: 0, stars: 0 };
    data.push({
      label: String(y),
      values: [metric === 'repos' ? v.repos : v.stars],
      tip: `${y}: ${v.repos} new repo${v.repos === 1 ? '' : 's'} · ${v.stars} star${v.stars === 1 ? '' : 's'}`,
    });
  }
  return barChart({
    data,
    series: [{ label: metric === 'repos' ? 'New repositories' : 'Stars', color: metric === 'repos' ? SERIES(0) : SERIES(3) }],
    title: metric === 'repos' ? 'Public repositories created per year' : 'Stars on repositories, by the year each was created',
    unit: metric,
    height: 190,
  });
}
