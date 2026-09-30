/**
 * Site-wide client entry (loaded once by Base.astro). Everything here either uses delegated
 * listeners on `document` (so it survives <ClientRouter /> navigations) or re-runs per page
 * through `everyPage`.
 */
import { hydrateContactLinks, copyText, getEmail, getPhone, toast } from './contact';
import { everyPage } from './lifecycle';
import { initMotion } from './motion';
import { initPalette } from './palette';
import { initTheme } from './theme';

/* ---------------- copy buttons (email / phone) ---------------- */
let copyWired = false;
function initCopy() {
  if (copyWired) return;
  copyWired = true;
  document.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const b = t.closest('[data-copy-email], [data-copy-phone]');
    if (!b) return;
    const isPhone = b.hasAttribute('data-copy-phone');
    const value = isPhone ? getPhone() : getEmail();
    const ok = value ? await copyText(value) : false;
    toast(ok ? `${isPhone ? 'Phone number' : 'Email'} copied to the clipboard` : `Could not copy the ${isPhone ? 'phone number' : 'email'}`);
  });
}

/* ---------------- margin notes on narrow screens: tap the number to open ---------------- */
let snWired = false;
function initSidenotes() {
  if (snWired) return;
  snWired = true;
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('sup.fn-ref a');
    if (!a || matchMedia('(min-width: 1100px)').matches) return;
    const sn = document.getElementById(a.closest<HTMLElement>('sup')!.dataset.sn ?? '');
    if (!sn) return;
    e.preventDefault();
    const open = sn.classList.toggle('open');
    a.setAttribute('aria-expanded', String(open));
  });
}

/* ---------------- mobile Contents sheet ---------------- */
let sheetWired = false;
function initSheet() {
  if (sheetWired) return;
  sheetWired = true;
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const dlg = document.getElementById('contents-sheet') as HTMLDialogElement | null;
    if (!dlg) return;
    if (t.closest('[data-sheet-open]')) {
      dlg.showModal();
      return;
    }
    if (!dlg.open) return;
    if (t.closest('[data-sheet-close]') || t === dlg || t.closest('#contents-sheet a') || t.closest('#contents-sheet [data-palette-open]')) dlg.close();
  });
  document.addEventListener('astro:before-swap', () => (document.getElementById('contents-sheet') as HTMLDialogElement | null)?.close());
}

initTheme();
initSheet();
initPalette();
initCopy();
initSidenotes();
everyPage(() => {
  initTheme();
  hydrateContactLinks();
  initMotion();
});
