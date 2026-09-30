/**
 * Motion layer, kept deliberately small. When an element scrolls into view it gets a class,
 * and CSS does the rest:
 *   [data-reveal]  -> .is-in   (paper slides in)
 *   .chart, [data-draw] -> .in (ink draws in: charts, trail, heatmap stamps)
 *   .hl            -> .in      (highlighter sweep)
 *   .stamp         -> .in      (rubber-stamp thud)
 * Nothing loops. Under prefers-reduced-motion everything is marked "in" at once, and the CSS
 * also disables the transitions, so the page is simply static.
 * Plus one delegated tooltip for chart marks (`data-tip`).
 */
import { prefersReducedMotion } from './lifecycle';

const SELECTOR = '[data-reveal]:not(.is-in), .chart:not(.in), [data-draw]:not(.in), .hl:not(.in), .stamp:not(.in)';

let io: IntersectionObserver | null = null;
function observer() {
  if (io) return io;
  io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        io!.unobserve(el);
        el.classList.add(el.matches('[data-reveal]') ? 'is-in' : 'in');
      }
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.1 },
  );
  return io;
}

/** Wire up everything animatable inside `root`. Safe to call repeatedly (injected content). */
export function refreshMotion(root: ParentNode = document) {
  const reduce = prefersReducedMotion();
  root.querySelectorAll<HTMLElement>('[data-stagger]').forEach((p) => {
    [...p.children].forEach((c, i) => (c as HTMLElement).style.setProperty('--i', String(Math.min(i, 12))));
  });
  root.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
    if (reduce || !('IntersectionObserver' in window)) {
      el.classList.add('is-in', 'in');
      return;
    }
    observer().observe(el);
  });
}

/* ---------------- chart tooltips (one floating slip, delegated) ---------------- */
let tipOn = false;
function initChartTips() {
  if (tipOn) return;
  tipOn = true;
  let tip: HTMLElement | null = null;
  const ensure = () => {
    if (tip && tip.isConnected) return tip;
    tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.setAttribute('aria-hidden', 'true');
    document.body.append(tip);
    return tip;
  };
  const hide = () => tip?.classList.remove('show');
  document.addEventListener(
    'pointermove',
    (e) => {
      const t = e.target instanceof Element ? e.target.closest<HTMLElement | SVGElement>('.chart [data-tip], .heatmap [data-tip]') : null;
      if (!t) return hide();
      const el = ensure();
      const text = (t as HTMLElement).dataset.tip ?? '';
      if (el.textContent !== text) el.textContent = text;
      const flip = e.clientX > innerWidth - 240;
      el.style.transform = `translate(${Math.round(e.clientX + (flip ? -14 : 14))}px, ${Math.round(e.clientY - 12)}px) translate(${flip ? '-100%' : '0'}, -100%)`;
      el.classList.add('show');
    },
    { passive: true },
  );
  document.addEventListener('scroll', hide, { passive: true });
  document.addEventListener('astro:before-swap', hide);
}

/** Called on every page (initial + after each client-side navigation). */
export function initMotion() {
  initChartTips();
  refreshMotion(document);
}
