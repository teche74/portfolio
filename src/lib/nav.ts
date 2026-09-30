/**
 * The notebook's sections, in binding order. One list drives the index tabs on the page
 * edge, the mobile tab strip + Contents sheet, the Contents page (with its page numbers) and
 * the card-catalogue search.
 *
 * `tab` is the colour of the index tab (a CSS var from global.css). `page` is the printed
 * page number on the Contents page, purely decorative.
 */
export interface NavItem {
  id: string;
  label: string;
  /** short label for the narrow mobile strip */
  short?: string;
  href: string;
  tab: string;
  page: number;
  blurb: string;
  /** shown in the mobile bottom strip (the rest live in the Contents sheet) */
  strip?: boolean;
}

export const NAV: NavItem[] = [
  { id: 'home', label: 'Contents', href: '/', tab: 'var(--tab-1)', page: 1, blurb: 'this page', strip: true },
  { id: 'about', label: 'About', href: '/about/', tab: 'var(--tab-2)', page: 3, blurb: 'the passport page', strip: true },
  { id: 'journey', label: 'Journey', href: '/journey/', tab: 'var(--tab-3)', page: 7, blurb: 'a trail map of the years so far' },
  { id: 'practice', label: 'Practice', href: '/practice/', tab: 'var(--tab-4)', page: 15, blurb: 'the ruled daily logbook', strip: true },
  { id: 'blog', label: 'Blog', href: '/blog/', tab: 'var(--tab-5)', page: 31, blurb: 'longer essays, with margin notes' },
  { id: 'reading', label: 'Reading', href: '/reading/', tab: 'var(--tab-6)', page: 45, blurb: 'the bookshelf and the card drawer', strip: true },
  { id: 'til', label: 'TIL', href: '/til/', tab: 'var(--tab-7)', page: 58, blurb: 'today-I-learned sticky notes' },
  { id: 'projects', label: 'Projects', href: '/projects/', tab: 'var(--tab-8)', page: 64, blurb: 'specimen sheets and the archive ledger' },
  { id: 'stats', label: 'Stats', href: '/stats/', tab: 'var(--tab-9)', page: 80, blurb: 'the report card' },
  { id: 'now', label: 'Now', href: '/now/', tab: 'var(--tab-10)', page: 88, blurb: 'this month’s planner page' },
  { id: 'resume', label: 'Resume', href: '/resume/', tab: 'var(--tab-11)', page: 92, blurb: 'the clipped-in CV' },
];

/** Which nav id a pathname (without base) belongs to. */
export function activeFor(path: string): string {
  const p = path.replace(/\/+$/, '/') || '/';
  if (p === '/' || p === '') return 'home';
  if (p.startsWith('/year/')) return 'practice';
  const hit = NAV.find((n) => n.href !== '/' && p.startsWith(n.href));
  return hit?.id ?? '';
}
