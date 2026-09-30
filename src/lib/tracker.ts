/**
 * Daily-log statistics + heatmap. Pure functions over "YYYY-MM-DD" strings — no local Date
 * parsing anywhere, so there is no timezone drift. "today" is supplied by the caller
 * (computed in IST via Intl), which lets the same code run at build time and in the browser.
 */
import { barChart, SERIES, OTHER } from './charts';
import { splitHoursText } from './daily-parts';
export interface LogItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  tags: string[];
  /** Optional extra learning topics (frontmatter `topics`), merged with tags for analytics. */
  topics?: string[];
  /** Total hours (work + self). */
  hours?: number;
  /** Present when the day has an "At work" half. */
  work?: { hours?: number };
  /** Present when the day has a "Self-improvement" half. */
  self?: { hours?: number };
}

export type TrackFilter = 'both' | 'work' | 'self';

/** The items of one half only, with `hours` set to that half's hours. */
export function forTrack(items: LogItem[], track: TrackFilter): LogItem[] {
  if (track === 'both') return items;
  return items
    .filter((i) => i[track])
    .map((i) => ({ ...i, hours: i[track]!.hours, work: track === 'work' ? i.work : undefined, self: track === 'self' ? i.self : undefined }));
}

/** Tags + topics, de-duplicated case-insensitively (first spelling wins). */
export function topicsOf(i: LogItem): string[] {
  const seen = new Map<string, string>();
  for (const t of [...(i.tags ?? []), ...(i.topics ?? [])]) {
    const k = t.trim().toLowerCase();
    if (k && !seen.has(k)) seen.set(k, t.trim());
  }
  return [...seen.values()];
}

const DAY_MS = 86400000;
const round1 = (n: number) => Math.round(n * 10) / 10;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const toMs = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, dd);
};
export const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => fromMs(toMs(d) + n * DAY_MS);

export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function prettyDay(d: string): string {
  const [y, m, dd] = d.split('-').map(Number);
  return `${DOW[new Date(toMs(d)).getUTCDay()]}, ${dd} ${MONTHS[m - 1]} ${y}`;
}

export interface Stats {
  totalEntries: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  longestEnd?: string;
  totalHours: number;
  workHours: number;
  selfHours: number;
  loggedToday: boolean;
}

export function computeStats(items: LogItem[], today: string): Stats {
  const days = [...new Set(items.map((i) => i.date))].filter((d) => d <= today).sort();
  const set = new Set(days);
  let longest = 0;
  let longestEnd: string | undefined;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    if (run > longest) {
      longest = run;
      longestEnd = d;
    }
    prev = d;
  }
  // The current streak survives until the end of today: if today isn't logged yet,
  // count back from yesterday.
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return {
    totalEntries: items.length,
    activeDays: days.length,
    currentStreak: current,
    longestStreak: longest,
    longestEnd,
    totalHours: round1(items.reduce((s, i) => s + (i.hours ?? 0), 0)),
    workHours: round1(items.reduce((s, i) => s + (i.work?.hours ?? 0), 0)),
    selfHours: round1(items.reduce((s, i) => s + (i.self?.hours ?? 0), 0)),
    loggedToday: set.has(today),
  };
}

export function yearsOf(items: LogItem[], today: string): number[] {
  const ys = new Set(items.map((i) => Number(i.date.slice(0, 4))));
  ys.add(Number(today.slice(0, 4)));
  return [...ys].sort((a, b) => b - a);
}

function level(entries: LogItem[]): number {
  if (!entries.length) return 0;
  const hours = entries.reduce((s, e) => s + (e.hours ?? 0), 0);
  if (hours > 0) return hours <= 1 ? 1 : hours <= 3 ? 2 : hours <= 6 ? 3 : 4;
  return Math.min(4, entries.length + 1);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** GitHub-style year heatmap (Sunday-first weeks), as an HTML string. */
export function heatmapHtml(items: LogItem[], year: number, today: string, hrefFor: (id: string) => string, what = 'Daily log activity'): string {
  const byDay = new Map<string, LogItem[]>();
  for (const i of items) {
    if (!i.date.startsWith(`${year}-`)) continue;
    const arr = byDay.get(i.date) ?? [];
    arr.push(i);
    byDay.set(i.date, arr);
  }
  const first = `${year}-01-01`;
  const last = `${year}-12-31`;
  const lead = new Date(toMs(first)).getUTCDay(); // blanks before Jan 1
  const cells: string[] = [];
  for (let i = 0; i < lead; i++) cells.push('<span class="cell pad" aria-hidden="true"></span>');
  let idx = lead;
  for (let d = first; d <= last; d = addDays(d, 1), idx++) {
    const col = Math.floor(idx / 7);
    const es = byDay.get(d) ?? [];
    const lv = level(es);
    const hrs = round1(es.reduce((s, e) => s + (e.hours ?? 0), 0));
    const split = splitHoursText(round1(es.reduce((s, e) => s + (e.work?.hours ?? 0), 0)), round1(es.reduce((s, e) => s + (e.self?.hours ?? 0), 0)));
    const label = `${prettyDay(d)}: ${es.length ? `${es.length} ${es.length > 1 ? 'entries' : 'entry'}${split ? ` · ${split}` : hrs ? ` · ${hrs}h` : ''} — ${es.map((e) => e.title).join('; ')}` : d > today ? 'future' : 'no entry'}`;
    const cls = `cell${d === today ? ' today' : ''}`;
    cells.push(
      es.length
        ? `<a class="${cls}" data-level="${lv}" style="--d:${col}" href="${esc(hrefFor(es[0].id))}" data-tip="${esc(label)}" aria-label="${esc(label)}"></a>`
        : `<span class="${cls}${d > today ? ' future' : ''}" data-level="0" style="--d:${col}" data-tip="${esc(label)}"></span>`,
    );
  }
  // Interleave a month-label slot at the top of every week column.
  const cols = Math.ceil(cells.length / 7);
  const out: string[] = [];
  let lastMonth = -1;
  for (let c = 0; c < cols; c++) {
    // month of the first real day in this column
    const dayIdx = Math.max(0, c * 7 - lead);
    const month = Number(addDays(first, dayIdx).slice(5, 7)) - 1;
    const show = month !== lastMonth && dayIdx <= 366 && addDays(first, dayIdx) <= last;
    out.push(`<span class="mlabel">${show ? MONTHS[month] : ''}</span>`);
    if (show) lastMonth = month;
    out.push(...cells.slice(c * 7, c * 7 + 7));
  }
  return `<div class="heatmap" data-draw role="group" aria-label="${esc(what)} for ${year}: ${byDay.size} active days"><span class="dlabels" aria-hidden="true"><span></span><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span></span>${out.join('')}</div>`;
}

export function monthCounts(items: LogItem[], year: number): number[] {
  const m = new Array(12).fill(0);
  for (const i of items) if (i.date.startsWith(`${year}-`)) m[Number(i.date.slice(5, 7)) - 1]++;
  return m;
}

export function monthBarsHtml(counts: number[], title = 'Entries per month'): string {
  if (!counts.some(Boolean)) return '<p class="muted empty-chart">No entries this year yet.</p>';
  return barChart({
    title,
    series: [{ label: 'Entries', color: SERIES(0) }],
    data: counts.map((c, i) => ({ label: MONTHS[i], values: [c], tip: `${MONTHS[i]}: ${c} ${c === 1 ? 'entry' : 'entries'}` })),
    height: 180,
  });
}

export function topTags(items: LogItem[], n = 8): [string, number][] {
  const m = new Map<string, number>();
  for (const i of items) for (const t of topicsOf(i)) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

/* ============================ learning analytics ============================ */

const shortDay = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (k: string, withYear = false) => `${MONTHS[Number(k.slice(5, 7)) - 1]}${withYear ? ` ${k.slice(0, 4)}` : ''}`;
function prevMonth(k: string, n: number): string {
  let y = Number(k.slice(0, 4));
  let m = Number(k.slice(5, 7)) - n;
  while (m < 1) {
    m += 12;
    y--;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

/** Monday of the week containing `d`. */
const weekStart = (d: string) => addDays(d, -((new Date(toMs(d)).getUTCDay() + 6) % 7));

export interface WeekHours {
  start: string;
  hours: number;
  work: number;
  self: number;
  entries: number;
}

export function weeklyHours(items: LogItem[], today: string, weeks = 12): WeekHours[] {
  const w0 = addDays(weekStart(today), -7 * (weeks - 1));
  const out: WeekHours[] = [];
  for (let i = 0; i < weeks; i++) out.push({ start: addDays(w0, 7 * i), hours: 0, work: 0, self: 0, entries: 0 });
  for (const it of items) {
    if (it.date < w0 || it.date > today) continue;
    const idx = Math.floor((toMs(it.date) - toMs(w0)) / (7 * DAY_MS));
    if (out[idx]) {
      out[idx].hours += it.hours ?? 0;
      out[idx].work += it.work?.hours ?? 0;
      // Hours not attributed to work (old-style entries included) count as self.
      out[idx].self += (it.hours ?? 0) - (it.work?.hours ?? 0);
      out[idx].entries++;
    }
  }
  return out.map((w) => ({ ...w, hours: round1(w.hours), work: round1(w.work), self: round1(w.self) }));
}

export function weeklyHoursHtml(items: LogItem[], today: string): string {
  const weeks = weeklyHours(items, today);
  if (!weeks.some((w) => w.entries)) return '<p class="muted empty-chart">No entries in the last 12 weeks yet.</p>';
  return barChart({
    title: 'Hours logged per week, last 12 weeks: at work and self-improvement',
    unit: 'h',
    decimals: 1,
    series: [
      { label: 'At work', color: SERIES(0) },
      { label: 'Self-improvement', color: SERIES(1) },
    ],
    data: weeks.map((w) => ({
      label: shortDay(w.start),
      values: [w.work, w.self],
      tip: `Week of ${shortDay(w.start)}: ${w.hours}h (${w.work}h at work, ${w.self}h self-improvement) across ${w.entries} ${w.entries === 1 ? 'entry' : 'entries'}`,
    })),
    height: 190,
  });
}

/**
 * Topics per month (stacked): the 5 most-used topics across the window keep fixed colour
 * slots; everything else folds into "Other" (never a generated hue).
 */
export function topicsByMonthHtml(items: LogItem[], today: string, months = 6): string {
  const last = monthKey(today);
  const keys = Array.from({ length: months }, (_, i) => prevMonth(last, months - 1 - i));
  const inWin = items.filter((i) => keys.includes(monthKey(i.date)) && i.date <= today);
  if (!inWin.some((i) => topicsOf(i).length)) return '<p class="muted empty-chart">No topics logged in the last few months yet.</p>';
  const totals = new Map<string, number>();
  for (const i of inWin) for (const t of topicsOf(i)) totals.set(t, (totals.get(t) ?? 0) + 1);
  const top = [...totals.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([t]) => t);
  const hasOther = [...totals.keys()].some((t) => !top.includes(t));
  const series = [...top.map((t, i) => ({ label: `#${t}`, color: SERIES(i) })), ...(hasOther ? [{ label: 'Other', color: OTHER }] : [])];
  const data = keys.map((k) => {
    const vals = new Array(series.length).fill(0);
    for (const i of inWin) {
      if (monthKey(i.date) !== k) continue;
      for (const t of topicsOf(i)) {
        const idx = top.indexOf(t);
        vals[idx >= 0 ? idx : series.length - 1]++;
      }
    }
    return { label: monthLabel(k, k.slice(5, 7) === '01' || k === keys[0]), values: vals };
  });
  return barChart({ title: 'Topics tagged per month (tag mentions)', series, data, height: 200, unit: 'mentions' });
}

/** Tags/topics from the last `days` days, most frequent first. */
export function recentTags(items: LogItem[], today: string, days = 7): [string, number][] {
  const from = addDays(today, -(days - 1));
  const m = new Map<string, number>();
  for (const i of items) if (i.date >= from && i.date <= today) for (const t of topicsOf(i)) m.set(t, (m.get(t) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** "Currently learning": a static list of highlighter tags (no looping animation). */
export function marqueeHtml(tags: [string, number][]): string {
  if (!tags.length) return '<p class="muted">Nothing logged in the last 7 days. This fills up as new entries come in.</p>';
  return `<ul class="hl-tags" aria-label="Topics from the last 7 days">${tags
    .map(([t, n], i) => `<li class="hl-tag" style="--hl:var(--hl-${i % 2 ? 'green' : 'yellow'})">${esc(t)}${n > 1 ? ` <span class="cnt">&times;${n}</span>` : ''}</li>`)
    .join('')}</ul>`;
}

export interface MonthRecap {
  key: string;
  entries: number;
  activeDays: number;
  hours: number;
  topTags: [string, number][];
  longestStreak: number;
}

export function monthlyRecaps(items: LogItem[], today: string, max = 6): MonthRecap[] {
  const by = new Map<string, LogItem[]>();
  for (const i of items) {
    if (i.date > today) continue;
    const k = monthKey(i.date);
    by.set(k, [...(by.get(k) ?? []), i]);
  }
  return [...by.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, max)
    .map(([key, list]) => {
      const days = [...new Set(list.map((i) => i.date))].sort();
      let longest = 0;
      let run = 0;
      let prev: string | null = null;
      for (const d of days) {
        run = prev && addDays(prev, 1) === d ? run + 1 : 1;
        longest = Math.max(longest, run);
        prev = d;
      }
      return {
        key,
        entries: list.length,
        activeDays: days.length,
        hours: round1(list.reduce((s, i) => s + (i.hours ?? 0), 0)),
        topTags: topTags(list, 3),
        longestStreak: longest,
      };
    });
}

/** Monthly recaps as torn receipt slips. */
export function recapsHtml(recaps: MonthRecap[]): string {
  if (!recaps.length) return '<p class="muted">Monthly recaps appear after the first entry.</p>';
  return `<ul class="slips">${recaps
    .map(
      (r, i) => `<li class="slip" style="--r:${((i % 3) - 1) * 0.8}deg" data-reveal>
  <h4 class="slip-h">${monthLabel(r.key, true)}</h4>
  <dl class="slip-rows">
    <div><dt>entries</dt><dd>${r.entries}</dd></div>
    <div><dt>hours</dt><dd>${r.hours}</dd></div>
    <div><dt>best streak</dt><dd>${r.longestStreak}d</dd></div>
  </dl>
  ${r.topTags.length ? `<p class="slip-tags">${r.topTags.map(([t, n]) => `<span>${esc(t)} &middot; ${n}</span>`).join('')}</p>` : '<p class="muted">No tags.</p>'}
</li>`,
    )
    .join('')}</ul>`;
}
