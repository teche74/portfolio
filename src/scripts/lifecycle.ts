/**
 * Page lifecycle for Astro's <ClientRouter />: bundled scripts run only ONCE per session,
 * but the DOM is swapped on every navigation. `onPage` runs `init` for the current page
 * now and after every client-side navigation ("astro:page-load"), once per root element.
 * It also works on pages without the router (e.g. /admin), where only the first call runs.
 */
export function onPage<T extends HTMLElement = HTMLElement>(rootId: string, init: (root: T) => void) {
  const run = () => {
    const el = document.getElementById(rootId) as T | null;
    if (!el || el.dataset.init === '1') return;
    el.dataset.init = '1';
    init(el);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  document.addEventListener('astro:page-load', run);
}

/** Run on every page (initial load + each client-side navigation). */
export function everyPage(fn: () => void) {
  let lastDoc: Element | null = null;
  const run = () => {
    // astro:page-load also fires on the initial load; skip if we already ran for this body.
    if (lastDoc === document.body) return;
    lastDoc = document.body;
    fn();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  document.addEventListener('astro:page-load', run);
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
