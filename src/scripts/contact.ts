/**
 * The email and phone are written into the HTML only in an obfuscated form (see
 * `obfuscatedEmail` / `obfuscatedPhone` in src/config.ts) and assembled here, in the browser.
 */
export const decodeEmail = (s: string) => [...s.replace(/\(at\)/g, '@').replace(/\(dot\)/g, '.')].reverse().join('');
export const decodePhone = (s: string) => [...s.replace(/\(p\)/g, '+').replace(/\(d\)/g, '-')].reverse().join('');

export function getEmail(): string {
  const raw = document.querySelector<HTMLElement>('[data-contact-email]')?.dataset.contactEmail ?? '';
  return raw ? decodeEmail(raw) : '';
}

export function getPhone(): string {
  const raw = document.querySelector<HTMLElement>('[data-contact-phone]')?.dataset.contactPhone ?? '';
  return raw ? decodePhone(raw) : '';
}

/** Fill `a[data-mailto]` / `a[data-tel]` placeholders (or remove them when unset). */
export function hydrateContactLinks() {
  const email = getEmail();
  const phone = getPhone();
  const fill = (sel: string, value: string, href: string) =>
    document.querySelectorAll<HTMLAnchorElement>(sel).forEach((a) => {
      if (!value) {
        (a.closest('li, [data-contact-row]') ?? a).remove();
        return;
      }
      a.href = href;
      a.querySelectorAll('[data-contact-text]').forEach((el) => (el.textContent = value));
    });
  fill('a[data-mailto]', email, `mailto:${email}`);
  fill('a[data-tel]', phone, `tel:${phone.replace(/[^+\d]/g, '')}`);
}

/** Back-compat name. */
export const hydrateEmailLinks = hydrateContactLinks;

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {}
    ta.remove();
    return ok;
  }
}

/** A small paper slip in the bottom corner (announced to screen readers). */
export function toast(msg: string) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  const t = el as HTMLElement & { _t?: number };
  clearTimeout(t._t);
  t._t = window.setTimeout(() => el!.classList.remove('show'), 2200);
}
