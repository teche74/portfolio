/**
 * Theme: "dark" | "light" on <html data-theme>. The initial value is set by an inline script
 * in <head> (before first paint, no flash) which also re-applies it on every client-side
 * navigation. This module handles the toggle button, the stored choice and OS changes.
 */
const root = () => document.documentElement;

export const currentTheme = () => (root().getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

export function syncThemeButton() {
  const dark = currentTheme() === 'dark';
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((b) => {
    b.setAttribute('aria-pressed', String(dark));
    b.setAttribute('aria-label', dark ? 'Desk lamp: switch to daylight paper' : 'Desk lamp: switch to the night desk');
  });
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = dark ? '#1d1a16' : '#f3eee3'));
}

export function setTheme(t: 'dark' | 'light', persist = true) {
  const r = root();
  r.classList.add('theme-anim');
  r.setAttribute('data-theme', t);
  if (persist) {
    try {
      localStorage.setItem('theme', t);
    } catch {}
  }
  syncThemeButton();
  window.setTimeout(() => r.classList.remove('theme-anim'), 450);
}

export const toggleTheme = () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark');

let wired = false;
export function initTheme() {
  syncThemeButton();
  if (wired) return;
  wired = true;
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('[data-theme-toggle]');
    if (!b) return;
    toggleTheme();
    // the pull-cord tug (CSS animation, off under reduced motion)
    b.classList.remove('pulled');
    void (b as HTMLElement).offsetWidth;
    b.classList.add('pulled');
  });
  // Follow OS theme changes only while the user hasn't picked one explicitly.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('theme');
    } catch {}
    if (!saved) setTheme(e.matches ? 'dark' : 'light', false);
  });
}
