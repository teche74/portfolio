/**
 * Command palette (Ctrl+K / ⌘K, or any [data-palette-open] button).
 *
 * - Index: built at build time into <script type="application/json" id="palette-index">,
 *   plus live public GitHub repos (loaded on first open, from the shared 1h cache).
 * - Fuzzy search: ordered-subsequence match, scored for word starts and consecutive runs.
 * - ARIA combobox pattern: input[role=combobox] + ul[role=listbox], aria-activedescendant,
 *   arrow keys / Home / End / Enter / Esc, focus trapped in the modal <dialog>.
 */
import { copyText, getEmail, toast } from './contact';
import { toggleTheme } from './theme';
import { ICON_PATHS, type IconName } from '../lib/icons';

export interface PaletteItem {
  id: string;
  title: string;
  group: string;
  hint?: string;
  href?: string;
  external?: boolean;
  download?: boolean;
  action?: 'theme' | 'copy-email';
  keywords?: string;
  icon?: IconName;
}

const GROUP_ORDER = ['Actions', 'Pages', 'Blog', 'Reading', 'TIL', 'Projects', 'Repositories', 'Journey', 'Practice log', 'Profiles & links'];
const MAX_PER_GROUP_EMPTY = 6;
const MAX_RESULTS = 60;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const icon = (n: IconName = 'arrow') => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="${ICON_PATHS[n]}"/></svg>`;

/** Returns a score (higher is better) and the matched character positions, or null. */
export function fuzzy(query: string, text: string): { score: number; hits: number[] } | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return { score: 0, hits: [] };
  const direct = t.indexOf(q);
  if (direct >= 0) {
    const hits = Array.from({ length: q.length }, (_, i) => direct + i);
    const wordStart = direct === 0 || /[\s\-_/·(.]/.test(t[direct - 1]);
    return { score: 100 + q.length * 4 + (wordStart ? 30 : 0) - direct * 0.5, hits };
  }
  let score = 0;
  let ti = 0;
  let prev = -2;
  const hits: number[] = [];
  for (const ch of q) {
    if (ch === ' ') continue;
    const found = t.indexOf(ch, ti);
    if (found < 0) return null;
    const boundary = found === 0 || /[\s\-_/·(.]/.test(t[found - 1]);
    score += 1 + (found === prev + 1 ? 5 : 0) + (boundary ? 8 : 0) - Math.min(4, (found - ti) * 0.2);
    hits.push(found);
    prev = found;
    ti = found + 1;
  }
  return { score, hits };
}

function highlight(text: string, hits: number[]) {
  if (!hits.length) return esc(text);
  const set = new Set(hits);
  let out = '';
  let open = false;
  for (let i = 0; i < text.length; i++) {
    const on = set.has(i);
    if (on && !open) out += '<mark>';
    if (!on && open) out += '</mark>';
    open = on;
    out += esc(text[i]);
  }
  return open ? `${out}</mark>` : out;
}

let staticItems: PaletteItem[] = [];
let liveItems: PaletteItem[] = [];
let liveLoaded = false;
let active = 0;
let results: PaletteItem[] = [];
let lastFocus: HTMLElement | null = null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

function readIndex() {
  const el = $('palette-index');
  if (!el) return;
  try {
    staticItems = JSON.parse(el.textContent || '[]');
  } catch {
    staticItems = [];
  }
}

async function loadLive() {
  if (liveLoaded) return;
  liveLoaded = true;
  const user = $('cmdk')?.dataset.github;
  if (!user) return;
  try {
    const { getGitHubData, publicRepos } = await import('../lib/profiles-client');
    const r = await getGitHubData(user);
    if (!r.data) return;
    const known = new Set(staticItems.filter((i) => i.group === 'Projects').map((i) => (i.href ?? '').toLowerCase()));
    liveItems = publicRepos(r.data)
      .filter((repo) => !known.has(repo.html_url.toLowerCase()))
      .map((repo) => ({
        id: `repo-${repo.name}`,
        title: repo.name,
        group: 'Repositories',
        hint: [repo.language, repo.stargazers_count ? `★ ${repo.stargazers_count}` : '', repo.fork ? 'fork' : ''].filter(Boolean).join(' · '),
        href: repo.html_url,
        external: true,
        keywords: `${repo.description ?? ''} ${(repo.topics ?? []).join(' ')}`,
        icon: 'github' as IconName,
      }));
    if ($<HTMLDialogElement>('cmdk')?.open) render();
  } catch {
    /* live repos are a bonus; the static index still works */
  }
}

function search(q: string): { item: PaletteItem; hits: number[] }[] {
  const all = [...staticItems, ...liveItems];
  const query = q.trim();
  if (!query) {
    const counts = new Map<string, number>();
    return all
      .filter((i) => i.group !== 'Repositories')
      .filter((i) => {
        const n = counts.get(i.group) ?? 0;
        counts.set(i.group, n + 1);
        return n < MAX_PER_GROUP_EMPTY;
      })
      .map((item) => ({ item, hits: [] }));
  }
  const scored: { item: PaletteItem; hits: number[]; score: number }[] = [];
  for (const item of all) {
    const t = fuzzy(query, item.title);
    const k = t ? null : fuzzy(query, `${item.group} ${item.hint ?? ''} ${item.keywords ?? ''}`);
    if (t) scored.push({ item, hits: t.hits, score: t.score + 20 });
    else if (k && k.score > query.length * 2) scored.push({ item, hits: [], score: k.score * 0.6 });
  }
  scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  return scored.slice(0, MAX_RESULTS);
}

function render() {
  const input = $<HTMLInputElement>('cmdk-input');
  const list = $<HTMLUListElement>('cmdk-list');
  const status = $('cmdk-status');
  if (!input || !list) return;
  const found = search(input.value);
  // group, in fixed order (query results keep score order inside each group)
  const groups = new Map<string, { item: PaletteItem; hits: number[] }[]>();
  const order = input.value.trim() ? [...new Set(found.map((f) => f.item.group))] : GROUP_ORDER;
  for (const g of order) groups.set(g, []);
  for (const f of found) (groups.get(f.item.group) ?? groups.set(f.item.group, []).get(f.item.group)!).push(f);
  results = [];
  let html = '';
  for (const [g, rows] of groups) {
    if (!rows.length) continue;
    const gid = `cmdk-g-${g.replace(/\W+/g, '-').toLowerCase()}`;
    html += `<li role="presentation" class="cmdk-group"><span id="${gid}" class="cmdk-group-label">${esc(g)}</span><ul role="group" aria-labelledby="${gid}">`;
    for (const { item, hits } of rows) {
      const idx = results.push(item) - 1;
      html += `<li role="option" id="cmdk-opt-${idx}" data-idx="${idx}" aria-selected="false" class="cmdk-item">
        <span class="cmdk-ico">${icon(item.icon ?? (item.external ? 'external' : 'arrow'))}</span>
        <span class="cmdk-title">${highlight(item.title, hits)}</span>
        ${item.hint ? `<span class="cmdk-hint">${esc(item.hint)}</span>` : ''}
        ${item.external ? '<span class="sr-only">(opens in new tab)</span>' : ''}
      </li>`;
    }
    html += '</ul></li>';
  }
  list.innerHTML = html || '<li role="presentation" class="cmdk-empty">No card in the drawer matches. Try a project, a book, a skill or a date.</li>';
  input.setAttribute('aria-expanded', String(results.length > 0));
  if (status) status.textContent = input.value.trim() ? `${results.length} result${results.length === 1 ? '' : 's'}` : '';
  setActive(Math.min(active, Math.max(0, results.length - 1)));
}

function setActive(i: number) {
  const input = $<HTMLInputElement>('cmdk-input');
  const list = $('cmdk-list');
  if (!input || !list) return;
  list.querySelector('[aria-selected="true"]')?.setAttribute('aria-selected', 'false');
  if (!results.length) {
    input.removeAttribute('aria-activedescendant');
    return;
  }
  active = (i + results.length) % results.length;
  const el = $(`cmdk-opt-${active}`);
  if (el) {
    el.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', el.id);
    el.scrollIntoView({ block: 'nearest' });
  }
}

async function run(item: PaletteItem | undefined, newTab = false) {
  if (!item) return;
  close(false);
  if (item.action === 'theme') {
    toggleTheme();
    lastFocus?.focus();
    return;
  }
  if (item.action === 'copy-email') {
    const email = getEmail();
    const ok = email ? await copyText(email) : false;
    toast(ok ? 'Email copied to the clipboard' : 'Could not copy — use the Email link in the footer');
    lastFocus?.focus();
    return;
  }
  if (!item.href) return;
  if (item.download) {
    const a = document.createElement('a');
    a.href = item.href;
    a.download = '';
    document.body.append(a);
    a.click();
    a.remove();
    return;
  }
  if (item.external || newTab) {
    window.open(item.href, '_blank', 'noopener,noreferrer');
    return;
  }
  try {
    const { navigate } = await import('astro:transitions/client');
    await navigate(item.href);
  } catch {
    location.href = item.href;
  }
}

export function open() {
  const dlg = $<HTMLDialogElement>('cmdk');
  const input = $<HTMLInputElement>('cmdk-input');
  if (!dlg || !input || dlg.open) return;
  readIndex();
  lastFocus = document.activeElement as HTMLElement | null;
  input.value = '';
  active = 0;
  render();
  dlg.showModal();
  document.documentElement.classList.add('cmdk-open');
  input.focus();
  loadLive();
}

function close(restore = true) {
  const dlg = $<HTMLDialogElement>('cmdk');
  if (!dlg?.open) return;
  dlg.close();
  document.documentElement.classList.remove('cmdk-open');
  if (restore) lastFocus?.focus();
}

let wired = false;
/** Global listeners are delegated to `document`, so they survive client-side navigation. */
export function initPalette() {
  if (wired) return;
  wired = true;
  document.addEventListener('keydown', (e) => {
    const dlg = $<HTMLDialogElement>('cmdk');
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey) && !e.altKey) {
      e.preventDefault();
      if (dlg?.open) close();
      else open();
      return;
    }
    if (!dlg?.open) return;
    const input = $<HTMLInputElement>('cmdk-input')!;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive(active + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive(active - 1);
        break;
      case 'Home':
        if (e.ctrlKey || !input.value) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case 'End':
        if (e.ctrlKey || !input.value) {
          e.preventDefault();
          setActive(results.length - 1);
        }
        break;
      case 'PageDown':
        e.preventDefault();
        setActive(Math.min(results.length - 1, active + 8));
        break;
      case 'PageUp':
        e.preventDefault();
        setActive(Math.max(0, active - 8));
        break;
      case 'Enter':
        if (e.target === input) {
          e.preventDefault();
          run(results[active], e.ctrlKey || e.metaKey);
        }
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'Tab': {
        // focus trap: cycle between the input and the close button
        const closeBtn = $('cmdk-close');
        e.preventDefault();
        (document.activeElement === input ? closeBtn : input)?.focus();
        break;
      }
    }
  });
  document.addEventListener('input', (e) => {
    if ((e.target as HTMLElement).id === 'cmdk-input') {
      active = 0;
      render();
    }
  });
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-palette-open]')) {
      e.preventDefault();
      open();
      return;
    }
    const dlg = $<HTMLDialogElement>('cmdk');
    if (!dlg?.open) return;
    if (t.closest('#cmdk-close')) return close();
    const opt = t.closest<HTMLElement>('[role="option"]');
    if (opt) return void run(results[Number(opt.dataset.idx)], e.ctrlKey || e.metaKey);
    if (t === dlg) close(); // click on the backdrop
  });
  document.addEventListener('mousemove', (e) => {
    const opt = (e.target as HTMLElement).closest?.<HTMLElement>('#cmdk [role="option"]');
    if (opt && Number(opt.dataset.idx) !== active) setActive(Number(opt.dataset.idx));
  });
  document.addEventListener('astro:before-swap', () => close(false));
  // native <dialog> "cancel" (Esc) — keep our state in sync
  document.addEventListener(
    'cancel',
    (e) => {
      if ((e.target as HTMLElement).id === 'cmdk') {
        e.preventDefault();
        close();
      }
    },
    true,
  );
}
