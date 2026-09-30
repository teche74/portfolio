#!/usr/bin/env node
/**
 * Scaffold a blog post, a reading entry or a TIL note.
 *   npm run new:post -- "Title of the post" [--tags qa,api]
 *   npm run new:read -- "Book title" [--author "Name"] [--type book|article|paper|video|course]
 *                                    [--status reading|finished|want] [--pages 320] [--url https://…]
 *   npm run new:til  -- "What I learned" [--tags git]
 * Dates are today in IST. The file name is a slug of the title (TILs: YYYY-MM-DD-slug.md).
 * New posts start as draft: true so they don't publish until you remove it.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TZ = 'Asia/Kolkata'; // keep in sync with TIMEZONE in src/config.ts
const TYPES = ['book', 'article', 'paper', 'video', 'course'];
const STATUS = ['reading', 'finished', 'want'];

const [kind, ...argv] = process.argv.slice(2);
if (!['post', 'read', 'til'].includes(kind)) {
  console.error('Usage: node scripts/new-content.mjs post|read|til "Title" [--flags]');
  process.exit(1);
}

const flags = {};
const rest = [];
for (let i = 0; i < argv.length; i++) {
  const m = /^--([a-z]+)(?:=(.*))?$/.exec(argv[i]);
  if (m) flags[m[1]] = m[2] ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '');
  else rest.push(argv[i]);
}

const title = rest.join(' ').trim() || { post: 'Untitled post', read: 'Untitled', til: 'Untitled note' }[kind];
const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const slug =
  title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'untitled';
const list = (s) => [...new Set(String(s ?? '').split(',').map((t) => t.trim()).filter(Boolean))];
const q = JSON.stringify; // JSON strings are valid YAML double-quoted scalars
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

let dir;
let base;
let fm;
let body;
if (kind === 'post') {
  dir = 'blog';
  base = slug;
  fm = [`title: ${q(title)}`, `date: ${q(today)}`, `summary: ""`, `tags: ${q(list(flags.tags))}`, 'draft: true'];
  body = 'Start with the problem, not the conclusion.\n\nA margin note looks like this.[^1]\n\n[^1]: Footnotes become pencilled margin notes on wide screens.\n';
} else if (kind === 'read') {
  const type = flags.type || 'book';
  const status = flags.status || 'reading';
  if (!TYPES.includes(type)) fail(`--type must be one of: ${TYPES.join(', ')}`);
  if (!STATUS.includes(status)) fail(`--status must be one of: ${STATUS.join(', ')}`);
  dir = 'reading';
  base = slug;
  fm = [`title: ${q(title)}`, `author: ${q(flags.author ?? '')}`, `type: ${q(type)}`, `status: ${q(status)}`];
  if (status !== 'want') fm.push(`started: ${q(today)}`);
  if (status === 'finished') fm.push(`finished: ${q(today)}`);
  if (flags.pages) {
    const n = Number(flags.pages);
    if (!Number.isInteger(n) || n < 1) fail('--pages must be a whole number');
    fm.push(`pages: ${n}`);
  }
  if (flags.url) fm.push(`url: ${q(flags.url)}`);
  fm.push(`tags: ${q(list(flags.tags))}`);
  body = 'Notes and highlights.\n';
} else {
  dir = 'til';
  base = `${today}-${slug}`;
  fm = [`date: ${q(today)}`, `title: ${q(title)}`, `tags: ${q(list(flags.tags))}`];
  body = 'One to five lines. Code is welcome.\n';
}

const folder = join(root, 'src', 'content', dir);
mkdirSync(folder, { recursive: true });
let file = join(folder, `${base}.md`);
for (let n = 2; existsSync(file); n++) file = join(folder, `${base}-${n}.md`);
writeFileSync(file, `---\n${fm.join('\n')}\n---\n\n${body}`);
console.log(`Created ${relative(root, file).split(sep).join('/')}`);
