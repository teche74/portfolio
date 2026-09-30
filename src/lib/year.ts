/**
 * Year in Review: which years have any data, and the totals for one year. Everything is
 * computed at build time from the collections + the timeline; GitHub repo counts are filled
 * in by the browser on the page itself (live API).
 */
import { getDailyEntries, logItemOf } from './daily';
import { getPosts, getReading, getTils } from './content';
import { getTimeline } from './timeline-data';
import { computeSkills, dateKey, type TimelineEntry } from './timeline';
import { addDays, topicsOf, type LogItem } from './tracker';

export async function availableYears(): Promise<number[]> {
  const [daily, posts, reading, tils] = await Promise.all([getDailyEntries(), getPosts(), getReading(), getTils()]);
  const ys = new Set<number>();
  const add = (d?: string | null) => d && /^\d{4}/.test(d) && ys.add(Number(d.slice(0, 4)));
  daily.forEach((d) => add(d.data.date));
  posts.forEach((p) => add(p.data.date));
  tils.forEach((t) => add(t.data.date));
  reading.forEach((r) => add(r.data.finished));
  getTimeline().forEach((e) => add(dateKey(e.start)));
  return [...ys].sort((a, b) => b - a);
}

export interface YearReport {
  year: number;
  hours: number;
  workHours: number;
  selfHours: number;
  entries: number;
  activeDays: number;
  longestStreak: number;
  books: number;
  finishedOther: number;
  posts: number;
  tils: number;
  newSkills: string[];
  topTopics: [string, number][];
  months: { entries: number; hours: number; posts: number; tils: number }[];
  highlights: TimelineEntry[];
}

export async function yearReport(year: number): Promise<YearReport> {
  const y = String(year);
  const [daily, posts, reading, tils] = await Promise.all([getDailyEntries(), getPosts(), getReading(), getTils()]);
  const items: LogItem[] = daily.filter((d) => d.data.date.startsWith(y)).map(logItemOf);
  const days = [...new Set(items.map((i) => i.date))].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const topics = new Map<string, number>();
  for (const i of items) for (const t of topicsOf(i)) topics.set(t, (topics.get(t) ?? 0) + 1);
  const ps = posts.filter((p) => p.data.date.startsWith(y));
  const ts = tils.filter((t) => t.data.date.startsWith(y));
  const fin = reading.filter((r) => r.data.status === 'finished' && (r.data.finished ?? '').startsWith(y));
  const months = Array.from({ length: 12 }, () => ({ entries: 0, hours: 0, posts: 0, tils: 0 }));
  for (const i of items) {
    const m = months[Number(i.date.slice(5, 7)) - 1];
    m.entries++;
    m.hours += i.hours ?? 0;
  }
  ps.forEach((p) => months[Number(p.data.date.slice(5, 7)) - 1].posts++);
  ts.forEach((t) => months[Number(t.data.date.slice(5, 7)) - 1].tils++);
  const timeline = getTimeline();
  const newSkills = computeSkills(timeline)
    .filter((s) => s.first.startsWith(y))
    .map((s) => s.name);
  const highlights = timeline
    .filter((e) => (dateKey(e.start) ?? '').startsWith(y))
    .sort((a, b) => (dateKey(a.start) ?? '').localeCompare(dateKey(b.start) ?? ''));
  return {
    year,
    hours: Math.round(items.reduce((s, i) => s + (i.hours ?? 0), 0) * 10) / 10,
    workHours: Math.round(items.reduce((s, i) => s + (i.work?.hours ?? 0), 0) * 10) / 10,
    selfHours: Math.round(items.reduce((s, i) => s + (i.self?.hours ?? 0), 0) * 10) / 10,
    entries: items.length,
    activeDays: days.length,
    longestStreak: longest,
    books: fin.filter((r) => r.data.type === 'book').length,
    finishedOther: fin.filter((r) => r.data.type !== 'book').length,
    posts: ps.length,
    tils: ts.length,
    newSkills,
    topTopics: [...topics.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8),
    months: months.map((m) => ({ ...m, hours: Math.round(m.hours * 10) / 10 })),
    highlights,
  };
}
