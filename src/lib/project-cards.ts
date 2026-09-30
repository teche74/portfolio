/**
 * Project card markup, shared by the build (featured cards from config + pitches) and the
 * browser (live GitHub enrichment, automatic featured pick, the "All repos" grid).
 */
import { REPO_PITCHES, type RepoPitch } from '../data/projects';
import { iconSvg } from './icons';
import { esc } from './stat-views';

export interface CardRepo {
  name: string;
  html_url: string;
  description?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  fork?: boolean;
  pushed_at?: string;
  created_at?: string;
  topics?: string[];
  homepage?: string | null;
}

export const pitchFor = (name: string): RepoPitch | undefined =>
  Object.entries(REPO_PITCHES).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1];

/** Readable fallback title from a repo name: "Kafka_Cassandra_Log" -> "Kafka Cassandra Log". */
export const prettyName = (name: string) => name.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** GitHub-ish language colours (identity only; always shown next to the language name). */
export const LANG_COLORS: Record<string, string> = {
  Python: '#3572A5',
  TypeScript: '#3178c6',
  JavaScript: '#e3b341',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#8b949e',
  'C#': '#178600',
  HTML: '#e34c26',
  CSS: '#663399',
  Astro: '#ff5a03',
  Shell: '#89e051',
  'Jupyter Notebook': '#DA5B0B',
  Scala: '#c22d40',
  R: '#198CE7',
  Go: '#00ADD8',
  Rust: '#dea584',
};

const safeUrl = (u?: string | null) => (u && /^https?:\/\//i.test(u) ? u : '');
const monthYear = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

const langDot = (l: string) => `<span class="lang-dot" style="background:${LANG_COLORS[l] ?? 'var(--graphite)'}" aria-hidden="true"></span>`;

/**
 * The margin of a specimen sheet: a rubber-stamped language, stars pencilled in the margin
 * and the last-updated date. Empty until live data arrives.
 */
export function projectMetaHtml(r: CardRepo): string {
  const bits: string[] = [];
  if (r.language) bits.push(`<span class="lang-stamp">${langDot(r.language)}${esc(r.language)}</span>`);
  if (r.stargazers_count !== undefined)
    bits.push(`<span class="margin-stars" title="Stars"><span aria-hidden="true">★</span> ${r.stargazers_count}<span class="sr-only"> stars</span></span>`);
  if (r.forks_count) bits.push(`<span class="margin-note" title="Forks">${r.forks_count} fork${r.forks_count === 1 ? '' : 's'}</span>`);
  if (r.pushed_at) bits.push(`<span class="margin-note">updated ${esc(monthYear(r.pushed_at))}</span>`);
  return bits.join('');
}

export function projectTopicsHtml(r: CardRepo, exclude: string[] = []): string {
  const ex = new Set(exclude.map((t) => t.toLowerCase().replace(/\s+/g, '-')));
  const topics = (r.topics ?? []).filter((t) => !ex.has(t.toLowerCase())).slice(0, 6);
  return topics.map((t) => `<li>${esc(t)}</li>`).join('');
}

function linksHtml(r: CardRepo, owner: string, p?: RepoPitch): string {
  const ext = (href: string, text: string, icon: 'github' | 'external' = 'external') =>
    `<a class="p-link" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${iconSvg(icon, 'mi')}${esc(text)}<span class="sr-only"> (opens in new tab)</span></a>`;
  const home = safeUrl(r.homepage);
  return [
    ext(r.html_url, 'Code', 'github'),
    ...(p?.related ?? []).map((rel) => ext(`https://github.com/${owner}/${rel.name}`, rel.label, 'github')),
    home ? ext(home, 'Live') : '',
  ].join('');
}

/** A featured project as a lab specimen sheet. `r` may be a bare {name, html_url} at build time. */
export function projectCardHtml(r: CardRepo, owner: string, index = 0): string {
  const p = pitchFor(r.name);
  const title = p?.title ?? prettyName(r.name);
  const pitch = p?.pitch ?? r.description ?? '';
  const tags = p?.tags ?? (r.language ? [r.language] : []);
  const no = String(index + 1).padStart(2, '0');
  return `<li class="specimen-wrap" style="--tilt:${(((index * 41) % 5) - 2) * 0.35}deg">
  <article class="specimen project-card" data-repo="${esc(r.name)}" aria-labelledby="sp-${esc(r.name)}">
    <span class="clip" aria-hidden="true"></span>
    <header class="sp-head"><span class="sp-no">Specimen No. ${no}</span><span class="sp-kind">${p?.kind ? esc(p.kind) : 'Project'}</span></header>
    <h3 id="sp-${esc(r.name)}"><a class="p-title" href="${esc(r.html_url)}" target="_blank" rel="noopener noreferrer">${esc(title)}<span class="sr-only"> (opens in new tab)</span></a></h3>
    <p class="sp-label"><code>${esc(r.name)}</code></p>
    ${pitch ? `<p class="p-pitch">${esc(pitch)}</p>` : ''}
    ${tags.length ? `<ul class="pencil-tags" aria-label="Tech">${tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <ul class="pencil-tags topics" aria-label="GitHub topics" data-slot="topics">${projectTopicsHtml(r, tags)}</ul>
    <footer class="sp-links" data-slot="links">${linksHtml(r, owner, p)}</footer>
    <aside class="sp-margin" data-slot="meta" aria-label="Repository details">${projectMetaHtml(r)}</aside>
  </article>
</li>`;
}

/** Fill the live slots of an already-rendered specimen sheet. */
export function enrichCard(card: HTMLElement, r: CardRepo, owner: string) {
  const p = pitchFor(r.name);
  const tags = p?.tags ?? (r.language ? [r.language] : []);
  const set = (slot: string, html: string) => {
    const el = card.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
    if (el) el.innerHTML = html;
  };
  set('meta', projectMetaHtml(r));
  set('topics', projectTopicsHtml(r, tags));
  set('links', linksHtml(r, owner, p));
  if (!p?.pitch && r.description && !card.querySelector('.p-pitch')) {
    card.querySelector('.sp-label')?.insertAdjacentHTML('afterend', `<p class="p-pitch">${esc(r.description)}</p>`);
  }
}

/** One row of the archive ledger (the "all repositories" table). */
export function repoCardHtml(r: CardRepo): string {
  const home = safeUrl(r.homepage);
  return `<tr>
  <th scope="row"><a href="${esc(r.html_url)}" target="_blank" rel="noopener noreferrer">${esc(r.name)}<span class="sr-only"> (opens in new tab)</span></a>${r.fork ? ' <span class="led-fork">fork</span>' : ''}${home ? ` <a class="led-live" href="${esc(home)}" target="_blank" rel="noopener noreferrer">live<span class="sr-only"> site (opens in new tab)</span></a>` : ''}<span class="led-desc">${r.description ? esc(r.description) : '<em>No description.</em>'}</span></th>
  <td class="led-lang">${r.language ? `${langDot(r.language)}${esc(r.language)}` : '—'}</td>
  <td class="led-num">${r.stargazers_count ?? 0}</td>
  <td class="led-date">${esc(monthYear(r.created_at))}</td>
  <td class="led-date">${esc(monthYear(r.pushed_at))}</td>
</tr>`;
}

