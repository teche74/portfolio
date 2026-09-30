/**
 * Journey timeline — shared, dependency-free helpers used both at build time (SSR)
 * and in the browser (merging live GitHub repos, admin page).
 */
export const ENTRY_TYPES = ['education', 'work', 'award', 'certification', 'skill', 'project'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const TYPE_META: Record<EntryType, { label: string; icon: string }> = {
  education: { label: 'Education', icon: '🎓' },
  work: { label: 'Work', icon: '💼' },
  award: { label: 'Award', icon: '🏆' },
  certification: { label: 'Certification', icon: '📜' },
  skill: { label: 'Skill', icon: '🧠' },
  project: { label: 'Project', icon: '🛠️' },
};

/**
 * How an entry is drawn on the Journey trail map. Each kind is a different paper object:
 * polaroid (education/work), medal (award), certificate (certification), flag (hackathon),
 * note (skill / hand-written project), camp (a quarter of auto-added GitHub repos).
 */
export type TrailKind = 'polaroid' | 'medal' | 'certificate' | 'flag' | 'note' | 'camp';

export const KIND_META: Record<TrailKind, { label: string }> = {
  polaroid: { label: 'Education & work' },
  medal: { label: 'Awards' },
  certificate: { label: 'Certificates' },
  flag: { label: 'Hackathons' },
  note: { label: 'Projects & skills' },
  camp: { label: 'GitHub camps' },
};
export const TRAIL_KINDS = Object.keys(KIND_META) as TrailKind[];

export function kindOf(e: TimelineEntry): TrailKind {
  if (e.source === 'github') return 'camp';
  if (e.type === 'education' || e.type === 'work') return 'polaroid';
  if (e.type === 'award') return 'medal';
  if (e.type === 'certification') return 'certificate';
  if (e.type === 'project' && /hackathon/i.test(`${e.org ?? ''} ${e.title}`)) return 'flag';
  return 'note';
}

export interface TimelineEntry {
  id: string;
  type: EntryType;
  title: string;
  org?: string;
  /** "YYYY", "YYYY-MM", "YYYY-MM-DD" or "TODO" */
  start: string;
  /** same formats, or "present"; omit for a single point in time */
  end?: string;
  description?: string;
  link?: string;
  credential?: string;
  tags?: string[];
  /** set by the GitHub merge — not stored in timeline.json */
  source?: 'manual' | 'github';
  stars?: number;
}

export const DATE_RE = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Sortable YYYY-MM-DD key, or null when the date is unknown ("TODO"). */
export function dateKey(d: string | undefined): string | null {
  const m = d ? DATE_RE.exec(d.trim()) : null;
  if (!m) return null;
  return `${m[1]}-${m[2] ?? '01'}-${m[3] ?? '01'}`;
}

export function formatDate(d: string | undefined): string {
  if (!d) return '';
  if (d.toLowerCase() === 'present') return 'Present';
  const m = DATE_RE.exec(d.trim());
  if (!m) return 'Date TODO';
  const [, y, mo, day] = m;
  if (!mo) return y;
  return `${day ? Number(day) + ' ' : ''}${MONTHS[Number(mo) - 1]} ${y}`;
}

export function formatRange(e: TimelineEntry): string {
  const s = formatDate(e.start);
  return e.end ? `${s} – ${formatDate(e.end)}` : s;
}

/** Newest first; undated ("TODO") entries float to the top so they get noticed and filled in. */
export function sortEntries(list: TimelineEntry[]): TimelineEntry[] {
  return [...list].sort((a, b) => {
    const ka = dateKey(a.start);
    const kb = dateKey(b.start);
    if (ka === kb) return a.title.localeCompare(b.title);
    if (ka === null) return -1;
    if (kb === null) return 1;
    return kb.localeCompare(ka);
  });
}

/** Calendar date (YYYY-MM-DD) of an ISO timestamp in the given timezone. */
export function dayInTz(iso: string | number | Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export interface RepoLike {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  created_at: string;
}

export function reposToEntries(
  repos: RepoLike[],
  opts: { username: string; includeForks: boolean; timeZone: string },
  /** Hand-written entries: repos they already link to are not added a second time. */
  manual: TimelineEntry[] = [],
): TimelineEntry[] {
  const linked = new Set(manual.map((e) => (e.link ?? '').toLowerCase().replace(/\/+$/, '')).filter(Boolean));
  return repos
    .filter((r) => (opts.includeForks || !r.fork) && r.name.toLowerCase() !== opts.username.toLowerCase())
    .filter((r) => !linked.has(r.html_url.toLowerCase().replace(/\/+$/, '')))
    .map((r) => ({
      id: `gh-${r.name}`,
      type: 'project' as const,
      title: r.name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim(),
      org: r.fork ? 'GitHub (fork)' : 'GitHub',
      start: dayInTz(r.created_at, opts.timeZone),
      description: r.description ?? undefined,
      link: r.html_url,
      tags: r.language ? [r.language] : [],
      source: 'github' as const,
      stars: r.stargazers_count,
    }));
}

export interface SkillStat {
  name: string;
  first: string; // YYYY-MM-DD
  count: number;
  firstTitle: string;
}

/** Aggregate tags across entries: when each skill first appeared, and how often. */
export function computeSkills(entries: TimelineEntry[]): SkillStat[] {
  const map = new Map<string, SkillStat>();
  for (const e of entries) {
    const k = dateKey(e.start);
    for (const raw of e.tags ?? []) {
      const name = raw.trim();
      if (!name) continue;
      const id = name.toLowerCase();
      const cur = map.get(id);
      if (!cur) {
        map.set(id, { name, first: k ?? '9999-12-31', count: 1, firstTitle: e.title });
      } else {
        cur.count++;
        if (k && k < cur.first) {
          cur.first = k;
          cur.firstTitle = e.title;
        }
      }
    }
  }
  return [...map.values()].sort((a, b) => a.first.localeCompare(b.first) || b.count - a.count);
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const safeUrl = (u?: string) => (u && /^(https?:|mailto:|\/)/i.test(u) ? u : '');

const ext = (href: string, text: string) =>
  `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${text}<span aria-hidden="true"> ↗</span><span class="sr-only"> (opens in new tab)</span></a>`;

const yearOf = (e: TimelineEntry) => (dateKey(e.start) ?? '').slice(0, 4);

/** Oldest first, undated last: the trail is walked from the trailhead to "you are here". */
export function trailOrder(list: TimelineEntry[]): TimelineEntry[] {
  const dated = list.filter((e) => dateKey(e.start));
  const undated = list.filter((e) => !dateKey(e.start));
  return [...sortEntries(dated).reverse(), ...undated];
}

/**
 * One trail stop (SSR + browser share this renderer, so markup never drifts). The pin sits
 * on the path; the paper object next to it depends on `kindOf`.
 */
export function entryHtml(e: TimelineEntry, index = 0): string {
  const kind = kindOf(e);
  const todo = /TODO/.test(`${e.title} ${e.org ?? ''} ${e.start} ${e.end ?? ''}`);
  const link = safeUrl(e.link);
  const cred = safeUrl(e.credential);
  const tilt = ((index * 37) % 7) - 3; // -3..3 deg, stable per position
  const tags = e.tags?.length ? `<p class="obj-tags">${e.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</p>` : '';
  const links = link || cred ? `<p class="obj-links">${link ? ext(link, 'Details') : ''}${cred ? ext(cred, 'Credential') : ''}</p>` : '';
  const when = `<time class="obj-date" datetime="${esc(dateKey(e.start) ?? '')}">${esc(formatRange(e))}</time>`;
  const desc = e.description ? `<p class="obj-desc">${esc(e.description)}</p>` : '';
  const org = e.org ? `<p class="obj-org">${esc(e.org)}</p>` : '';
  const todoNote = todo ? '<p class="pencil-note">date to be filled in</p>' : '';
  let body = '';
  if (kind === 'polaroid') {
    const init = (e.org ?? e.title)
      .replace(/[^A-Za-z ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
    body = `<div class="polaroid" style="--tilt:${tilt}deg"><div class="polaroid-photo p-${esc(e.type)}" aria-hidden="true"><span class="pol-init">${esc(init)}</span><span class="pol-yr">${esc(yearOf(e))}</span></div><div class="polaroid-cap">${when}<h3>${esc(e.title)}</h3>${org}</div></div>${desc}${tags}${links}`;
  } else if (kind === 'medal') {
    body = `<div class="medal-row"><span class="medal" aria-hidden="true"><span class="ribbon"></span><span class="disc">${esc(yearOf(e).slice(2) ? `’${yearOf(e).slice(2)}` : '—')}</span></span><div>${when}<h3>${esc(e.title)}</h3>${org}</div></div>${desc}${links}`;
  } else if (kind === 'certificate') {
    body = `<div class="certificate" style="--tilt:${tilt / 2}deg"><p class="cert-kicker">Certificate</p><h3>${esc(e.title)}</h3>${org}${when}<span class="cert-seal" aria-hidden="true"></span></div>${desc}${tags}${links}`;
  } else if (kind === 'flag') {
    body = `<div class="flag-row"><span class="flag" aria-hidden="true"><span class="pole"></span><span class="cloth"></span></span><div>${when}<h3>${esc(e.title)}</h3>${org}</div></div>${desc}${tags}${links}`;
  } else {
    body = `<div class="field-note" style="--tilt:${tilt / 2}deg">${when}<h3>${esc(e.title)}</h3>${org}${desc}${tags}${links}</div>`;
  }
  return `<li class="trail-stop k-${kind}" data-kind="${kind}" data-type="${esc(e.type)}" data-source="${e.source ?? 'manual'}"><span class="pin" aria-hidden="true"></span><article class="stop-obj">${todoNote}${body}</article></li>`;
}

/** Quarter key "2025-Q3" of a GitHub entry. */
const quarterOf = (e: TimelineEntry) => {
  const k = dateKey(e.start) ?? '0000-01-01';
  return `${k.slice(0, 4)}-Q${Math.floor((Number(k.slice(5, 7)) - 1) / 3) + 1}`;
};

/** One expandable "camp": the GitHub repos created in one quarter. */
function campHtml(q: string, list: TimelineEntry[]): string {
  const [y, qq] = q.split('-');
  const rows = [...list]
    .sort((a, b) => (dateKey(a.start) ?? '').localeCompare(dateKey(b.start) ?? ''))
    .map((r) => {
      const lang = r.tags?.[0];
      const href = safeUrl(r.link);
      return `<li>${href ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}<span class="sr-only"> (opens in new tab)</span></a>` : esc(r.title)}<span class="camp-lang">${esc(lang ?? '—')}</span><span class="camp-stars"><span aria-hidden="true">★</span> ${r.stars ?? 0}<span class="sr-only"> stars</span></span></li>`;
    })
    .join('');
  return `<li class="trail-stop k-camp" data-kind="camp" data-type="project" data-source="github" data-q="${esc(q)}"><span class="pin" aria-hidden="true"></span><article class="stop-obj"><details class="camp"><summary><span class="tent" aria-hidden="true"></span><span class="camp-t">${esc(qq)} ${esc(y)} camp</span><span class="camp-n">${list.length} repo${list.length === 1 ? '' : 's'}</span></summary><ul class="camp-list">${rows}</ul></details></article></li>`;
}

/**
 * The whole trail, chronologically: hand-written stops and quarterly GitHub camps
 * interleaved by date, ending at a "you are here" pin.
 */
export function trailHtml(entries: TimelineEntry[]): string {
  const manual = trailOrder(entries.filter((e) => e.source !== 'github'));
  const rows: { key: string; html: string }[] = manual.map((e, i) => ({ key: dateKey(e.start) ?? '9999-12-30', html: entryHtml(e, i) }));
  const byQ = new Map<string, TimelineEntry[]>();
  for (const r of entries.filter((e) => e.source === 'github')) byQ.set(quarterOf(r), [...(byQ.get(quarterOf(r)) ?? []), r]);
  for (const [q, list] of byQ) {
    const [y, qq] = q.split('-Q');
    rows.push({ key: `${y}-${String((Number(qq) - 1) * 3 + 3).padStart(2, '0')}-28`, html: campHtml(q, list) });
  }
  rows.sort((a, b) => a.key.localeCompare(b.key));
  return (
    rows.map((r) => r.html).join('') +
    '<li class="trail-stop k-here" data-kind="here"><span class="pin here" aria-hidden="true"></span><article class="stop-obj"><p class="here-label">you are here</p></article></li>'
  );
}

/**
 * Skills as visa stamps, dated by the year each first shows up (from `computeSkills`).
 * With `groups` (config SKILLS) the stamps are grouped by category; otherwise one sheet.
 */
export function skillsHtml(skills: SkillStat[], groups: { group: string; items: string[] }[] = []): string {
  if (!skills.length && !groups.length) return '<p class="muted">No skills tagged yet.</p>';
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]/g, '');
  const firstOf = new Map(skills.map((s) => [norm(s.name), s]));
  const stamp = (name: string, s: SkillStat | undefined, i: number) => {
    const yr = s && !s.first.startsWith('9999') ? s.first.slice(0, 4) : '';
    const shape = ['rect', 'round', 'oct'][i % 3];
    const tip = s ? `${name}: first seen ${yr} in "${s.firstTitle}"` : name;
    return `<li class="visa ${shape}" style="--rot:${((i * 53) % 13) - 6}deg;--ink:var(--ink-s${(i % 6) + 1})" title="${esc(tip)}"><span class="visa-y">${esc(yr ? `since ${yr}` : 'admitted')}</span><span class="visa-n">${esc(name)}</span></li>`;
  };
  if (!groups.length) return `<ul class="visas">${skills.map((s, i) => stamp(s.name, s, i)).join('')}</ul>`;
  return groups
    .map(
      (g, gi) =>
        `<section class="visa-page"><h3 class="visa-cat">${esc(g.group)}</h3><ul class="visas">${g.items.map((it, i) => stamp(it, firstOf.get(norm(it)), gi * 7 + i)).join('')}</ul></section>`,
    )
    .join('');
}
