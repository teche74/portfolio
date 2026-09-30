/**
 * The two halves of a logbook day: "At work" (industry work) and "Self-improvement"
 * (personal learning and practice). Client-safe (no astro:content), so /admin can use the
 * same rules as the build.
 *
 * In the Markdown body the halves are marked by the headings `## At work` and
 * `## Self-improvement`. Anything before the first of them is a shared intro. An old-style
 * entry with neither heading is treated as self-improvement.
 */
export type Track = 'work' | 'self';
export const TRACKS: Track[] = ['work', 'self'];
export const TRACK_LABEL: Record<Track, string> = { work: 'At work', self: 'Self-improvement' };
export const TRACK_SHORT: Record<Track, string> = { work: 'work', self: 'self' };

/** "At work" / "Self improvement" / "self-improvement:" etc. → track, else null. */
export function trackOfHeading(text: string): Track | null {
  const k = text.toLowerCase().replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/g, '').replace(/[^a-z]/g, '');
  if (k === 'atwork' || k === 'work') return 'work';
  if (k === 'selfimprovement' || k === 'self') return 'self';
  return null;
}

export interface SplitBody {
  intro: string;
  work?: string;
  self?: string;
  /** True when at least one of the two headings was found. */
  marked: boolean;
}

function splitBy(src: string, re: RegExp, headingText: (m: RegExpExecArray) => string): SplitBody {
  const out: SplitBody = { intro: '', marked: false };
  const cuts: { at: number; end: number; track: Track }[] = [];
  let m: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((m = re.exec(src))) {
    const t = trackOfHeading(headingText(m));
    if (t) cuts.push({ at: m.index, end: m.index + m[0].length, track: t });
  }
  if (!cuts.length) {
    out.intro = src.trim();
    return out;
  }
  out.marked = true;
  out.intro = src.slice(0, cuts[0].at).trim();
  cuts.forEach((c, i) => {
    const text = src.slice(c.end, cuts[i + 1]?.at ?? src.length).trim();
    out[c.track] = out[c.track] ? `${out[c.track]}\n\n${text}` : text;
  });
  return out;
}

/** Split a Markdown body on `## At work` / `## Self-improvement` lines. */
export function splitMarkdown(md: string): SplitBody {
  return splitBy(md.replace(/\r\n?/g, '\n'), /^##[ \t]+(.+?)[ \t]*#*[ \t]*$/gm, (m) => m[1]);
}

/** Split rendered HTML on the matching `<h2>` elements. */
export function splitHtml(html: string): SplitBody {
  return splitBy(html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (m) => m[1]);
}

/** Plain-text excerpt of an HTML fragment, for the logbook lines. */
export function excerpt(html: string, max = 150): string {
  const text = html
    .replace(/<(h\d)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : text;
}

/** "2h work · 1.5h self" (only the halves that have hours). */
export function splitHoursText(work?: number, self?: number): string {
  const bits: string[] = [];
  if (work) bits.push(`${work}h work`);
  if (self) bits.push(`${self}h self`);
  return bits.join(' · ');
}
