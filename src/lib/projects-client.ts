/**
 * Browser side of the Projects section:
 *  - enriches the build-time featured cards with live language / stars / topics / homepage,
 *  - or, when FEATURED_REPOS is empty, picks the featured repos automatically,
 *  - renders the filterable archive ledger (all repositories).
 */
import { getGitHubData, publicRepos, type GhRepo } from './profiles-client';
import { enrichCard, projectCardHtml, repoCardHtml } from './project-cards';
import { refreshMotion } from '../scripts/motion';

const PAGE = 12;

/** Automatic pick: non-fork, non-archived; stars first, then most recent push. */
export function autoFeatured(repos: GhRepo[], n: number): GhRepo[] {
  return repos
    .filter((r) => !r.fork && !r.archived)
    .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0) || String(b.pushed_at).localeCompare(String(a.pushed_at)))
    .slice(0, n);
}

export async function initProjects(root: HTMLElement) {
  const user = root.dataset.github ?? '';
  const featured = JSON.parse(root.dataset.featured ?? '[]') as string[];
  const autoCount = Number(root.dataset.autoCount ?? 6);
  const list = root.querySelector<HTMLElement>('#featured-list');
  const grid = document.getElementById('repo-grid');
  const status = document.getElementById('repo-status');
  if (!user) return;

  const r = await getGitHubData(user);
  if (!r.data) {
    if (list && !featured.length) list.innerHTML = '<li class="panel-note">The specimens could not be fetched from GitHub right now.</li>';
    if (status) status.innerHTML = r.error ?? 'Could not load repositories.';
    grid?.setAttribute('aria-busy', 'false');
    return;
  }
  const repos = publicRepos(r.data);
  const byName = new Map(repos.map((x) => [x.name.toLowerCase(), x]));

  if (list) {
    if (featured.length) {
      list.querySelectorAll<HTMLElement>('.project-card[data-repo]').forEach((card) => {
        const repo = byName.get((card.dataset.repo ?? '').toLowerCase());
        if (repo) enrichCard(card, repo, user);
      });
    } else {
      list.innerHTML = autoFeatured(repos, autoCount)
        .map((x, i) => projectCardHtml(x, user, i))
        .join('');
      list.setAttribute('aria-busy', 'false');
      refreshMotion(list);
    }
  }
  if (grid) initRepoGrid(repos, r.stale);
}

function initRepoGrid(repos: GhRepo[], stale: boolean) {
  const grid = document.getElementById('repo-grid')!;
  const q = document.getElementById('repo-q') as HTMLInputElement | null;
  const lang = document.getElementById('repo-lang') as HTMLSelectElement | null;
  const sort = document.getElementById('repo-sort') as HTMLSelectElement | null;
  const forks = document.getElementById('repo-forks') as HTMLInputElement | null;
  const more = document.getElementById('repo-more') as HTMLButtonElement | null;
  const status = document.getElementById('repo-status');
  let limit = PAGE;

  if (lang) {
    const counts = new Map<string, number>();
    repos.forEach((r) => r.language && counts.set(r.language, (counts.get(r.language) ?? 0) + 1));
    lang.innerHTML =
      '<option value="">All languages</option>' +
      [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([l, n]) => `<option value="${l.replace(/"/g, '&quot;')}">${l.replace(/</g, '&lt;')} (${n})</option>`)
        .join('');
  }

  const render = () => {
    const term = (q?.value ?? '').trim().toLowerCase();
    const l = lang?.value ?? '';
    const withForks = !!forks?.checked;
    const list = repos.filter(
      (r) =>
        (withForks || !r.fork) &&
        (!l || r.language === l) &&
        (!term || `${r.name} ${r.description ?? ''} ${(r.topics ?? []).join(' ')} ${r.language ?? ''}`.toLowerCase().includes(term)),
    );
    const s = sort?.value ?? 'pushed';
    list.sort((a, b) =>
      s === 'stars'
        ? (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0) || a.name.localeCompare(b.name)
        : s === 'name'
          ? a.name.localeCompare(b.name)
          : s === 'created'
            ? String(b.created_at).localeCompare(String(a.created_at))
            : String(b.pushed_at).localeCompare(String(a.pushed_at)),
    );
    grid.innerHTML = list.length ? list.slice(0, limit).map(repoCardHtml).join('') : '<tr><td colspan="5" class="led-empty">No entries in the ledger match that search.</td></tr>';
    grid.setAttribute('aria-busy', 'false');
    if (more) {
      more.hidden = list.length <= limit;
      more.textContent = `Show more (${list.length - limit} left)`;
    }
    if (status) status.textContent = `Showing ${Math.min(limit, list.length)} of ${list.length} repositories${stale ? ' (cached; GitHub API unavailable right now)' : ''}.`;
  };
  const reset = () => {
    limit = PAGE;
    render();
  };
  q?.addEventListener('input', reset);
  lang?.addEventListener('change', reset);
  sort?.addEventListener('change', reset);
  forks?.addEventListener('change', reset);
  more?.addEventListener('click', () => {
    limit += PAGE;
    render();
  });
  render();
}
