import { getCollection, type CollectionEntry } from 'astro:content';
import { splitHtml, TRACKS, type Track } from './daily-parts';
import type { LogItem } from './tracker';

export type DailyEntry = CollectionEntry<'daily'>;

/** One half of a day, normalised. `html` is that half's rendered notes (may be empty). */
export interface LogPart {
  track: Track;
  hours?: number;
  tags: string[];
  topics: string[];
  html: string;
}

export interface DayParts {
  work?: LogPart;
  self?: LogPart;
  /** Notes before the first "At work"/"Self-improvement" heading. */
  intro: string;
  /** work + self hours (undefined when neither half tracks time). */
  hours?: number;
  /** Tags of both halves, de-duplicated. */
  tags: string[];
  topics: string[];
}

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
const hasData = (p?: { hours?: number; tags?: string[]; topics?: string[] }) =>
  !!p && (p.hours !== undefined || !!p.tags?.length || !!p.topics?.length);

/**
 * Split an entry into its work and self halves. A half exists when its frontmatter object
 * is present or its heading is in the body. Old-style entries (top-level hours/tags/topics,
 * a body without the headings) become the self half.
 */
export function partsOf(e: DailyEntry): DayParts {
  const d = e.data;
  const body = splitHtml(e.rendered?.html ?? '');
  const legacy = { hours: d.hours, tags: d.tags ?? [], topics: d.topics ?? [] };
  const out: DayParts = { intro: body.marked ? body.intro : '', tags: [], topics: [] };

  let unmarkedTo: Track | null = null;
  if (!body.marked && body.intro) {
    // No headings: the notes belong to the only half there is, else to self (old style).
    unmarkedTo = d.work && !d.self && !hasData(legacy) ? 'work' : 'self';
  }
  for (const t of TRACKS) {
    const fm = t === 'work' ? d.work : d.self;
    const html = (t === 'work' ? body.work : body.self) ?? (unmarkedTo === t ? body.intro : undefined);
    const extra = t === 'self' ? legacy : undefined;
    const present = fm !== undefined || html !== undefined || (t === 'self' && hasData(legacy));
    if (!present) continue;
    out[t] = {
      track: t,
      hours: fm?.hours ?? extra?.hours,
      tags: uniq([...(fm?.tags ?? []), ...(extra?.tags ?? [])]),
      topics: uniq([...(fm?.topics ?? []), ...(extra?.topics ?? [])]),
      html: html ?? '',
    };
  }
  // An entry with nothing at all still counts as a (self) day, so it shows up somewhere.
  if (!out.work && !out.self) out.self = { track: 'self', tags: [], topics: [], html: '' };
  const hs = [out.work?.hours, out.self?.hours].filter((h): h is number => h !== undefined);
  out.hours = hs.length ? Math.round(hs.reduce((a, b) => a + b, 0) * 10) / 10 : undefined;
  out.tags = uniq([...(out.work?.tags ?? []), ...(out.self?.tags ?? [])]);
  out.topics = uniq([...(out.work?.topics ?? []), ...(out.self?.topics ?? [])]);
  return out;
}

/** The tracker's view of an entry: totals plus the per-half hours. */
export function logItemOf(e: DailyEntry): LogItem {
  const p = partsOf(e);
  return {
    id: e.id,
    date: e.data.date,
    title: e.data.title,
    tags: p.tags,
    topics: p.topics,
    hours: p.hours,
    work: p.work ? { hours: p.work.hours } : undefined,
    self: p.self ? { hours: p.self.hours } : undefined,
  };
}

/** All published entries, newest first (same-day entries ordered by id, descending). */
export async function getDailyEntries(): Promise<DailyEntry[]> {
  const all = await getCollection('daily', ({ data }) => !data.draft);
  return all.sort((a, b) =>
    a.data.date === b.data.date ? b.id.localeCompare(a.id) : b.data.date.localeCompare(a.data.date),
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Format a YYYY-MM-DD string without constructing a local Date (no TZ shifting). */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[dow]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

export function allTags(entries: DailyEntry[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const e of entries) for (const t of partsOf(e).tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function slugTag(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
