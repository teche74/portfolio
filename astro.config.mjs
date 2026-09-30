// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import satteriSidenotes from './src/lib/satteri-sidenotes.mjs';

/**
 * SITE_URL and BASE_PATH are injected by the GitHub Actions workflow
 * (from actions/configure-pages), so the same code works for:
 *   - a project site:  https://<user>.github.io/<repo>/   (BASE_PATH=/<repo>)
 *   - a user site:     https://<user>.github.io/          (BASE_PATH=/)
 *   - Netlify / Vercel / Cloudflare Pages                 (defaults below)
 */
const site = process.env.SITE_URL || 'https://example.com';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  output: 'static',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  markdown: {
    // Footnotes become pencilled margin notes (see src/lib/satteri-sidenotes.mjs).
    processor: satteri({ hastPlugins: satteriSidenotes }),
    shikiConfig: { theme: 'github-light', wrap: true },
  },
  integrations: [sitemap({ filter: (page) => !/\/admin\/?$/.test(page) })],
  // Old URLs from the previous design keep working.
  redirects: {
    '/daily': '/practice',
    '/daily/tracker': '/practice/tracker',
    '/daily/[...id]': '/practice/[...id]',
    '/profiles': '/stats',
  },
});
