/** Build-time loader: validates src/data/timeline.json so a bad edit fails the build loudly. */
import { z } from 'astro/zod';
import raw from '../data/timeline.json';
import { ENTRY_TYPES, DATE_RE, type TimelineEntry } from './timeline';

const dateField = z.string().refine((d) => d === 'TODO' || DATE_RE.test(d), {
  message: 'use YYYY, YYYY-MM, YYYY-MM-DD or "TODO"',
});

const Entry = z.object({
  id: z.string().min(1),
  type: z.enum(ENTRY_TYPES),
  title: z.string().min(1),
  org: z.string().optional(),
  start: dateField,
  end: z.union([dateField, z.literal('present')]).optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  credential: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export function getTimeline(): TimelineEntry[] {
  const parsed = z.array(Entry).safeParse(raw);
  if (!parsed.success) {
    throw new Error(`src/data/timeline.json is invalid:\n${parsed.error.message}`);
  }
  const ids = new Set<string>();
  for (const e of parsed.data) {
    if (ids.has(e.id)) throw new Error(`src/data/timeline.json: duplicate id "${e.id}"`);
    ids.add(e.id);
  }
  return parsed.data.map((e) => ({ ...e, source: 'manual' as const }));
}
