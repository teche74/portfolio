/**
 * Build-time access to the blog, reading, TIL and Now collections, plus the small bits of
 * maths their pages share (reading time, book-spine geometry, reading stats).
 *
 * Drafts are always hidden. Entries with `sample: true` are shown only while SHOW_SAMPLES
 * (src/config.ts) is true, and every page marks them with a pencilled "sample" note.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { SHOW_SAMPLES } from '../config';

export type Post = CollectionEntry<'blog'>;
export type Read = CollectionEntry<'reading'>;
export type Til = CollectionEntry<'til'>;
export type Now = CollectionEntry<'now'>;

const visible = (d: { draft?: boolean; sample?: boolean }) => !d.draft && (SHOW_SAMPLES || !d.sample);

export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('blog', ({ data }) => visible(data));
  return all.sort((a, b) => b.data.date.localeCompare(a.data.date) || a.id.localeCompare(b.id));
}

const STATUS_ORDER = { reading: 0, finished: 1, want: 2 } as const;

/** Reading list: currently reading first, then finished (newest first), then the wishlist. */
export async function getReading(): Promise<Read[]> {
  const all = await getCollection('reading', ({ data }) => visible(data));
  return all.sort(
    (a, b) =>
      STATUS_ORDER[a.data.status] - STATUS_ORDER[b.data.status] ||
      (b.data.finished ?? b.data.started ?? '').localeCompare(a.data.finished ?? a.data.started ?? '') ||
      a.data.title.localeCompare(b.data.title),
  );
}

export async function getTils(): Promise<Til[]> {
  const all = await getCollection('til', ({ data }) => visible(data));
  return all.sort((a, b) => b.data.date.localeCompare(a.data.date) || b.id.localeCompare(a.id));
}

export async function getNow(): Promise<Now | undefined> {
  const all = await getCollection('now', ({ data }) => SHOW_SAMPLES || !data.sample);
  return all[0];
}

/** Words / 220 wpm, at least one minute. Code blocks count, front matter does not. */
export function readingMinutes(body = ''): number {
  const words = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Stable 32-bit FNV-1a hash (used for "random" but repeatable spine colours, tilts…). */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Book-spine geometry: colour slot 1-8, height (px) from the title hash, width from pages. */
export function spineOf(title: string, pages?: number) {
  const h = hashStr(title);
  const p = pages ?? 250;
  return {
    color: (h % 8) + 1,
    height: 176 + (h % 5) * 11, // 176-220
    width: Math.round(Math.min(64, Math.max(30, 22 + p / 18))),
    band: (h >>> 3) % 3, // which decoration the spine gets
  };
}

/** Deterministic small rotation in degrees for sticky notes / index cards. */
export const tiltOf = (id: string, range = 3) => ((hashStr(id) % (range * 20 + 1)) / 10 - range).toFixed(1);

export interface ReadingStats {
  booksThisYear: number;
  pagesRead: number;
  finishedTotal: number;
  /** consecutive calendar months, ending this month or last, in which something was finished */
  monthStreak: number;
}

export function readingStats(items: Read[], today: string): ReadingStats {
  const year = today.slice(0, 4);
  const books = items.filter((r) => r.data.type === 'book');
  const booksThisYear = books.filter((r) => r.data.status === 'finished' && (r.data.finished ?? '').startsWith(year)).length;
  const pagesRead = Math.round(
    books.reduce((s, r) => {
      if (!r.data.pages) return s;
      if (r.data.status === 'finished') return s + r.data.pages;
      if (r.data.status === 'reading') return s + (r.data.pages * (r.data.progress ?? 0)) / 100;
      return s;
    }, 0),
  );
  const months = new Set(items.filter((r) => r.data.status === 'finished' && r.data.finished).map((r) => r.data.finished!.slice(0, 7)));
  const prev = (k: string) => {
    let y = Number(k.slice(0, 4));
    let m = Number(k.slice(5, 7)) - 1;
    if (m < 1) {
      m = 12;
      y--;
    }
    return `${y}-${String(m).padStart(2, '0')}`;
  };
  let cursor = today.slice(0, 7);
  if (!months.has(cursor)) cursor = prev(cursor);
  let monthStreak = 0;
  while (months.has(cursor)) {
    monthStreak++;
    cursor = prev(cursor);
  }
  return { booksThisYear, pagesRead, finishedTotal: items.filter((r) => r.data.status === 'finished').length, monthStreak };
}

/** Pencil stars for a 0-5 rating (halves allowed), as accessible HTML. */
export function starsHtml(rating?: number): string {
  if (rating === undefined) return '';
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let out = '';
  for (let i = 0; i < 5; i++) out += `<span class="pstar${i < full ? ' on' : i === full && half ? ' half' : ''}" aria-hidden="true">★</span>`;
  return `<span class="pstars" role="img" aria-label="Rated ${rating} out of 5">${out}</span>`;
}
