/**
 * Field specs for the Markdown documents the /admin page can write. The same spec drives the
 * server-rendered form and the client code that turns the form into a file, so a field added
 * here appears in both. Keep it in sync with src/content.config.ts.
 */
import { READING_STATUS, READING_TYPES, STATUS_LABEL, TYPE_LABEL } from './reading-meta';
import { splitMarkdown, TRACK_LABEL, type Track } from './daily-parts';

export type FieldType = 'text' | 'date' | 'number' | 'select' | 'tags' | 'check' | 'url';

export interface FieldSpec {
  key: string;
  label: string;
  type: FieldType;
  hint?: string;
  required?: boolean;
  wide?: boolean;
  /** Not written to the frontmatter: used only to build the file name. */
  fileOnly?: boolean;
  /** Default for a new document; 'today' means today's date in IST. */
  def?: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

/**
 * One half of a daily entry ("At work" / "Self-improvement"): its own frontmatter block
 * (e.g. `work: { hours, tags }`), its own Markdown editor, and a `## Heading` in the body.
 */
export interface PartSpec {
  key: Track;
  heading: string;
  label: string;
  hint?: string;
  fields: FieldSpec[];
}

export type DocKind = 'daily' | 'blog' | 'reading' | 'til' | 'now';

export interface DocSpec {
  kind: DocKind;
  label: string;
  /** Folder, or null for a single fixed file. */
  dir: string | null;
  fixedPath?: string;
  /** What to do when the target file already exists and nothing was loaded. */
  onExists: 'suffix' | 'ask';
  fields: FieldSpec[];
  /** Split documents (daily): the body is composed from one editor per part. */
  parts?: PartSpec[];
  body: string;
  /** Builds the file name (without .md) from the form values. */
  fileName: (v: Record<string, unknown>) => string;
  intro: string;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

const str = (v: unknown) => String(v ?? '').trim();
const slugOr = (v: Record<string, unknown>) => slugify(str(v.slug) || str(v.title)) || 'untitled';

const SAMPLE: FieldSpec = { key: 'sample', label: 'Sample (placeholder content)', type: 'check', hint: 'shown with a "sample" note; hidden when SHOW_SAMPLES is false' };
const DRAFT: FieldSpec = { key: 'draft', label: 'Draft (not published)', type: 'check' };
const PART_HOURS: FieldSpec = { key: 'hours', label: 'Hours', type: 'number', min: 0, max: 24, step: 0.5, hint: 'optional, drawn as tallies' };
const TAGS: FieldSpec = { key: 'tags', label: 'Tags', type: 'tags', hint: 'comma-separated', wide: true, placeholder: 'qa, playwright' };

export function docSpecs(repo: { dailyDir: string; blogDir: string; readingDir: string; tilDir: string; nowPath: string }): DocSpec[] {
  return [
    {
      kind: 'daily',
      label: 'Daily log',
      dir: repo.dailyDir,
      onExists: 'suffix',
      intro: 'One entry per day (a second entry on the same day becomes YYYY-MM-DD-2.md). Shows on the practice logbook and the tracker.',
      fields: [
        { key: 'date', label: 'Date', type: 'date', required: true, def: 'today', hint: 'defaults to today (IST)' },
        { key: 'mood', label: 'Mood', type: 'text', hint: 'optional, e.g. 🙂', placeholder: '🙂' },
        { key: 'title', label: 'Title', type: 'text', required: true, wide: true, placeholder: 'What I worked on today' },
        DRAFT,
      ],
      parts: [
        {
          key: 'work',
          heading: TRACK_LABEL.work,
          label: 'At work',
          hint: 'Keep it general: no client names, ticket IDs or internal details.',
          fields: [PART_HOURS, { ...TAGS, hint: 'comma-separated, general skills only', placeholder: 'qa, api testing' }],
        },
        {
          key: 'self',
          heading: TRACK_LABEL.self,
          label: 'Self-improvement',
          fields: [
            PART_HOURS,
            { ...TAGS, placeholder: 'dsa, playwright' },
            { key: 'topics', label: 'Topics', type: 'tags', wide: true, hint: 'optional: what you studied (the tracker counts these)', placeholder: 'kafka, dynamic programming' },
          ],
        },
      ],
      body: `## ${TRACK_LABEL.work}\n\n- \n\n## ${TRACK_LABEL.self}\n\n- \n`,
      fileName: (v) => str(v.date),
    },
    {
      kind: 'blog',
      label: 'Blog post',
      dir: repo.blogDir,
      onExists: 'ask',
      intro: 'Essays for the manuscript index. Footnotes ([^1]) become margin notes. The file name is the URL slug.',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
        { key: 'slug', label: 'Slug', type: 'text', fileOnly: true, hint: 'optional, defaults to the title', placeholder: 'my-post' },
        { key: 'date', label: 'Date', type: 'date', required: true, def: 'today' },
        { key: 'summary', label: 'Summary', type: 'text', wide: true, hint: 'one sentence, shown on the index and in RSS' },
        TAGS,
        { key: 'cover', label: 'Cover image', type: 'text', hint: 'optional URL or /public path' },
        { ...DRAFT, def: true },
        SAMPLE,
      ],
      body: 'Start with the problem, not the conclusion.\n\nA margin note looks like this.[^1]\n\n[^1]: Footnotes become pencilled margin notes on wide screens.\n',
      fileName: slugOr,
    },
    {
      kind: 'reading',
      label: 'Reading',
      dir: repo.readingDir,
      onExists: 'ask',
      intro: 'Books become spines on the shelf; articles, papers, videos and courses become index cards in the drawer.',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
        { key: 'slug', label: 'Slug', type: 'text', fileOnly: true, hint: 'optional, defaults to the title' },
        { key: 'author', label: 'Author', type: 'text' },
        { key: 'type', label: 'Type', type: 'select', def: 'book', options: READING_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] })) },
        { key: 'status', label: 'Status', type: 'select', def: 'reading', options: READING_STATUS.map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
        { key: 'started', label: 'Started', type: 'date' },
        { key: 'finished', label: 'Finished', type: 'date' },
        { key: 'rating', label: 'Rating', type: 'number', min: 0, max: 5, step: 0.5, hint: '0-5, halves allowed' },
        { key: 'pages', label: 'Pages', type: 'number', min: 1, max: 20000, step: 1 },
        { key: 'progress', label: 'Progress %', type: 'number', min: 0, max: 100, step: 1, hint: 'while reading' },
        { key: 'url', label: 'Link', type: 'url', placeholder: 'https://' },
        { key: 'cover', label: 'Cover image', type: 'text', hint: 'optional' },
        TAGS,
        DRAFT,
        SAMPLE,
      ],
      body: 'Notes and highlights.\n',
      fileName: slugOr,
    },
    {
      kind: 'til',
      label: 'TIL',
      dir: repo.tilDir,
      onExists: 'ask',
      intro: 'A sticky note for the TIL wall: one to five lines. Saved as YYYY-MM-DD-slug.md.',
      fields: [
        { key: 'date', label: 'Date', type: 'date', required: true, def: 'today' },
        { key: 'title', label: 'Title', type: 'text', required: true, wide: true, placeholder: 'One-line summary' },
        { key: 'slug', label: 'Slug', type: 'text', fileOnly: true, hint: 'optional, defaults to the title' },
        TAGS,
        DRAFT,
        SAMPLE,
      ],
      body: 'One to five lines. Code is welcome.\n',
      fileName: (v) => `${str(v.date)}-${slugOr(v)}`,
    },
    {
      kind: 'now',
      label: 'Now',
      dir: null,
      fixedPath: repo.nowPath,
      onExists: 'ask',
      intro: 'The single planner page at /now. Use "- [x]" and "- [ ]" for ticked and open items. Load it first to edit the current version.',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true, hint: 'usually the month', placeholder: 'October 2026' },
        { key: 'updated', label: 'Updated', type: 'date', required: true, def: 'today' },
        { key: 'location', label: 'Location', type: 'text', placeholder: 'Noida, India' },
        SAMPLE,
      ],
      body: '## This month\n\n- [ ] \n\n## Practising\n\n- [ ] \n\n## Not doing\n\n- \n',
      fileName: () => 'now',
    },
  ];
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function fieldLines(fields: FieldSpec[], values: Record<string, unknown>, indent = '', keepEmptyTags = true): string[] {
  const lines: string[] = [];
  for (const f of fields) {
    if (f.fileOnly) continue;
    const v = values[f.key];
    if (f.type === 'check') {
      if (v) lines.push(`${indent}${f.key}: true`);
    } else if (f.type === 'tags') {
      const list = Array.isArray(v) ? v : [];
      if (list.length || (keepEmptyTags && f.key === 'tags')) lines.push(`${indent}${f.key}: ${JSON.stringify(list)}`);
    } else if (f.type === 'number') {
      if (v !== '' && v !== undefined && v !== null && Number.isFinite(Number(v))) lines.push(`${indent}${f.key}: ${Number(v)}`);
    } else if (str(v)) {
      lines.push(`${indent}${f.key}: ${JSON.stringify(str(v))}`);
    }
  }
  return lines;
}

/** A part editor left at its template ("- ") counts as empty. */
const isBlank = (md: string) => /^[\s*-]*$/.test(md);

/** Join the part editors into one body (`## At work` …, `## Self-improvement` …), skipping empty parts. */
export function composeParts(spec: DocSpec, bodies: Partial<Record<Track, string>>): string {
  return (spec.parts ?? [])
    .map((p) => ({ p, text: (bodies[p.key] ?? '').trim() }))
    .filter((x) => !isBlank(x.text))
    .map((x) => `## ${x.p.heading}\n\n${x.text}`)
    .join('\n\n');
}

/**
 * The reverse of composeParts, for loading a file: split on the part headings. An old-style
 * body with no headings (and any text before the first heading) goes to self-improvement,
 * unless the file has only a `work:` block.
 */
export function splitParts(fm: Record<string, unknown>, md: string): Record<Track, string> {
  const sb = splitMarkdown(md);
  if (!sb.marked) {
    const workOnly = isObj(fm.work) && !isObj(fm.self) && fm.hours === undefined && fm.tags === undefined && fm.topics === undefined;
    return workOnly ? { work: sb.intro, self: '' } : { work: '', self: sb.intro };
  }
  return { work: sb.work ?? '', self: [sb.intro, sb.self ?? ''].filter(Boolean).join('\n\n') };
}

/**
 * The frontmatter values of one part. Old-style top-level hours/tags/topics are read into
 * self-improvement, so loading and re-saving an old file converts it to the new format.
 */
export function partValues(fm: Record<string, unknown>, key: Track): Record<string, unknown> {
  const own = isObj(fm[key]) ? fm[key] : {};
  if (key !== 'self') return own;
  const merged: Record<string, unknown> = { ...own };
  if (merged.hours === undefined && fm.hours !== undefined) merged.hours = fm.hours;
  for (const k of ['tags', 'topics']) {
    const a = Array.isArray(own[k]) ? (own[k] as unknown[]) : [];
    const b = Array.isArray(fm[k]) ? (fm[k] as unknown[]) : [];
    if (a.length || b.length) merged[k] = [...new Set([...a, ...b].map(String))];
  }
  return merged;
}

/**
 * Serialise form values to a Markdown file. JSON strings are valid YAML double-quoted scalars.
 * For split documents `values[part.key]` holds that part's values, written as an indented
 * block (left out when the part has no hours, tags or topics).
 */
export function toMarkdown(spec: DocSpec, values: Record<string, unknown>, body: string): string {
  const lines = fieldLines(spec.fields, values);
  for (const p of spec.parts ?? []) {
    const v = values[p.key];
    const inner = isObj(v) ? fieldLines(p.fields, v, '  ', false) : [];
    if (inner.length) lines.push(`${p.key}:`, ...inner);
  }
  return `---\n${lines.join('\n')}\n---\n\n${body.trim()}\n`;
}

/** A small frontmatter reader for files this editor (or the templates) wrote. */
export function parseMarkdown(text: string): { fm: Record<string, unknown>; body: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  const fm: Record<string, unknown> = {};
  const scalar = (raw: string): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      if (/^\[.*\]$/.test(raw))
        return raw
          .slice(1, -1)
          .split(',')
          .map((x) => x.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      return raw.replace(/^['"]|['"]$/g, '');
    }
  };
  if (m) {
    // One level of nesting: `work:` followed by indented `  hours: 2` lines.
    let block: Record<string, unknown> | null = null;
    for (const line of m[1].split(/\r?\n/)) {
      if (!line.trim() || /^\s*#/.test(line)) continue;
      const sub = /^[ \t]+(\w+):\s*(.*)$/.exec(line);
      if (sub) {
        if (block) block[sub[1]] = scalar(sub[2].trim());
        continue;
      }
      block = null;
      const kv = /^(\w+):\s*(.*)$/.exec(line);
      if (!kv) continue;
      const raw = kv[2].trim();
      if (raw) fm[kv[1]] = scalar(raw);
      else fm[kv[1]] = block = {};
    }
  }
  return { fm, body: (m ? m[2] : text).replace(/^\n+/, '') };
}
