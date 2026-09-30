#!/usr/bin/env node
/**
 * Create today's daily-log entry from the template.
 *   npm run new-entry                                  -> src/content/daily/<today IST>.md
 *   npm run new-entry -- "My title"                    -> same, with a title
 *   npm run new-entry -- 2026-10-01 "..."              -> a specific date
 *   npm run new-entry -- "..." --work-hours 6 --work-tags qa,api --self-hours 1.5 --self-tags dsa
 *                              [--self-topics kafka,"dynamic programming"] [--work-topics ...] [--mood 🙂]
 * The day has two halves, "At work" and "Self-improvement" (see _TEMPLATE.md). The old flags
 * --tags/--topics/--hours still work and fill the self-improvement half.
 * All flags are optional; an empty flag simply leaves the template value.
 * If the day already has an entry, creates <date>-2.md, <date>-3.md, ...
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'content', 'daily');
const TZ = 'Asia/Kolkata'; // keep in sync with TIMEZONE in src/config.ts

const flags = {};
const rest = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  const m = /^--((?:work-|self-)?(?:tags|topics|hours)|mood)(?:=(.*))?$/.exec(argv[i]);
  if (m) flags[m[1]] = m[2] ?? (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '');
  else rest.push(argv[i]);
}

let date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
if (rest[0] && /^\d{4}-\d{2}-\d{2}$/.test(rest[0])) date = rest.shift();
const title = rest.join(' ').trim();
const list = (s) => [...new Set(String(s ?? '').split(',').map((t) => t.trim()).filter(Boolean))];

mkdirSync(dir, { recursive: true });
let file = join(dir, `${date}.md`);
for (let n = 2; existsSync(file); n++) file = join(dir, `${date}-${n}.md`);

let text = readFileSync(join(dir, '_TEMPLATE.md'), 'utf8').replace(/\r\n?/g, '\n').replace(/YYYY-MM-DD/g, date);
if (title) text = text.replace(/^title: .*$/m, `title: ${JSON.stringify(title)}`);

/** Set `key:` inside the indented `block:` of the frontmatter (adding the block or line if missing). */
function setIn(block, key, value) {
  const re = new RegExp(`^${block}:[ \\t]*\\n((?:[ \\t]+.*(?:\\n|$))*)`, 'm');
  const m = re.exec(text);
  if (!m) {
    text = text.replace(/\n---\n/, `\n${block}:\n  ${key}: ${value}\n---\n`);
    return;
  }
  const inner = m[1];
  const line = new RegExp(`^([ \\t]+)${key}:.*$`, 'm');
  const next = line.test(inner) ? inner.replace(line, `$1${key}: ${value}`) : `${inner.replace(/\n?$/, '\n')}  ${key}: ${value}\n`;
  text = text.slice(0, m.index) + `${block}:\n` + next + text.slice(m.index + m[0].length);
}
for (const part of ['work', 'self']) {
  const get = (k) => flags[`${part}-${k}`] ?? (part === 'self' ? flags[k] : undefined);
  if (list(get('tags')).length) setIn(part, 'tags', JSON.stringify(list(get('tags'))));
  if (list(get('topics')).length) setIn(part, 'topics', JSON.stringify(list(get('topics'))));
  const hv = get('hours');
  if (hv !== undefined && hv !== '') {
    const h = Number(hv);
    if (!Number.isFinite(h) || h < 0 || h > 24) {
      console.error(`--${part}-hours must be a number from 0 to 24`);
      process.exit(1);
    }
    setIn(part, 'hours', String(h));
  }
}
if (flags.mood) text = text.replace(/^mood: .*$/m, `mood: ${JSON.stringify(flags.mood)}`);
writeFileSync(file, text);
console.log(`Created ${relative(root, file).split(sep).join('/')}`);
