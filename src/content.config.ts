import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { READING_STATUS, READING_TYPES } from './lib/reading-meta';

/**
 * Content collections. Every folder ignores files that start with "_" (templates).
 *
 *   daily/    YYYY-MM-DD.md       the practice log: an "At work" and a "Self-improvement" half per day
 *   blog/     <slug>.md           essays
 *   reading/  <slug>.md           books, articles, papers, videos, courses
 *   til/      YYYY-MM-DD-slug.md  "today I learned" sticky notes
 *   now.md                        the single Now page
 *
 * Blog, reading, TIL and Now entries may carry `sample: true`; see SHOW_SAMPLES in config.ts.
 */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Unquoted YAML dates arrive as UTC-midnight Date objects; turn them back into the literal day. */
const day = z
  .union([z.string(), z.date()])
  .transform((d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d.trim()))
  .refine((d) => ISO_DAY.test(d), { message: 'date must be YYYY-MM-DD' });

const optionalDay = z.preprocess((v) => (v === '' || v === null ? undefined : v), day.optional());
const optionalNum = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), z.number().min(min).max(max).optional());
const optionalStr = z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().optional());

/** One half of a logbook day (work or self-improvement). Every field is optional. */
const logPart = z.preprocess(
  (v) => (v === null || v === '' ? undefined : v),
  z
    .object({
      /** Hours spent on this half (0-24). */
      hours: optionalNum(0, 24),
      tags: z.array(z.string()).default([]),
      /** Optional study topics, merged with tags on the tracker. */
      topics: z.array(z.string()).default([]),
    })
    .optional(),
);

/**
 * The practice log. A day has two independent halves, `work` (industry work) and `self`
 * (personal learning), each with its own hours and tags; the body splits them with the
 * headings "## At work" and "## Self-improvement". Either half may be missing.
 * Backward compatible: the top-level `hours`/`tags`/`topics` of an old-style entry (and a
 * body with neither heading) count as `self`.
 */
const daily = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/_*.md'], base: './src/content/daily' }),
  schema: z.object({
    date: day,
    title: z.string(),
    work: logPart,
    self: logPart,
    /** Old-style fields: treated as part of `self`. */
    tags: z.array(z.string()).default([]),
    topics: z.array(z.string()).default([]),
    hours: optionalNum(0, 24),
    mood: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/_*.md'], base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: day,
    summary: z.string().default(''),
    tags: z.array(z.string()).default([]),
    /** Optional cover image URL or /public path. */
    cover: optionalStr,
    draft: z.boolean().default(false),
    sample: z.boolean().default(false),
  }),
});

const reading = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/_*.md'], base: './src/content/reading' }),
  schema: z.object({
    title: z.string(),
    author: z.string().default(''),
    type: z.enum(READING_TYPES).default('book'),
    status: z.enum(READING_STATUS).default('want'),
    started: optionalDay,
    finished: optionalDay,
    /** 0-5, halves allowed. */
    rating: optionalNum(0, 5),
    url: optionalStr,
    cover: optionalStr,
    tags: z.array(z.string()).default([]),
    /** Page count (books). */
    pages: optionalNum(1, 20000),
    /** 0-100, how far through you are. */
    progress: optionalNum(0, 100),
    draft: z.boolean().default(false),
    sample: z.boolean().default(false),
  }),
});

const til = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/_*.md'], base: './src/content/til' }),
  schema: z.object({
    date: day,
    title: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    sample: z.boolean().default(false),
  }),
});

const now = defineCollection({
  loader: glob({ pattern: 'now.md', base: './src/content' }),
  schema: z.object({
    /** e.g. "October 2026" */
    title: z.string().default('Now'),
    updated: day,
    location: z.string().optional(),
    sample: z.boolean().default(false),
  }),
});

export const collections = { daily, blog, reading, til, now };
