import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../config';
import { getPosts } from '../lib/content';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return rss({
    title: `${SITE.name} · Manuscripts`,
    description: `Essays by ${SITE.name}: testing, algorithms and data engineering.`,
    site: new URL(`${base}/`, context.site ?? 'https://teche74.github.io').href,
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: new Date(`${p.data.date}T00:00:00Z`),
      description: p.data.summary,
      link: `${base}/blog/${p.id}/`,
      categories: p.data.tags,
    })),
    customData: '<language>en-in</language>',
  });
}
