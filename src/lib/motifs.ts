/**
 * Small hand-drawn motifs shared by pages (build time) and client scripts: tally marks for
 * hours, doodled mood glyphs, and the pencil "sample" note.
 */

/** Hours as tally marks: one stroke per hour, gated in fives; a half hour is a short stroke. */
export function tallyHtml(hours: number | undefined, cls = ''): string {
  if (hours === undefined || hours === null || !(hours > 0)) return '';
  const whole = Math.floor(hours);
  const half = hours - whole >= 0.5;
  const capped = Math.min(whole, 20);
  const groups: string[] = [];
  for (let g = 0; g < capped; g += 5) {
    const n = Math.min(5, capped - g);
    const strokes = Math.min(n, 4);
    groups.push(`<span class="tally-g${n === 5 ? ' five' : ''}">${'<i></i>'.repeat(strokes)}</span>`);
  }
  if (half) groups.push('<span class="tally-g"><i class="half"></i></span>');
  const label = `${hours} hour${hours === 1 ? '' : 's'}`;
  return `<span class="tally ${cls}" role="img" aria-label="${label}">${groups.join('')}<span class="tally-n" aria-hidden="true">${hours}h</span></span>`;
}

/** Doodle for a mood emoji (the daily-log `mood` field). Unknown moods fall back to a star. */
const MOODS: Record<string, { label: string; d: string }> = {
  '💪': { label: 'strong', d: '<path d="M4 20c2-6 3-10 6-12 2-1 4 0 4 2 0 2-2 2-3 1"/><path d="M10 8c3 2 7 2 10 6-2 4-8 6-16 6"/>' },
  '🧪': { label: 'experimenting', d: '<path d="M9 3h6M10 3v6l-5 10c-.5 1 .2 2 1.2 2h11.6c1 0 1.7-1 1.2-2L14 9V3"/><path d="M7.5 15h9"/><circle cx="11" cy="18" r=".6"/><circle cx="14" cy="17" r=".6"/>' },
  '🚀': { label: 'shipping', d: '<path d="M12 2c4 3 5 8 3 13H9C7 10 8 5 12 2z"/><circle cx="12" cy="9" r="1.6"/><path d="M9 15l-3 3 1-5M15 15l3 3-1-5M10.5 18c0 2 1.5 3 1.5 4 0-1 1.5-2 1.5-4"/>' },
  '😊': { label: 'happy', d: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1.5 2 6.5 2 8 0"/><path d="M9 9.5v.5M15 9.5v.5"/>' },
  '😴': { label: 'tired', d: '<circle cx="12" cy="13" r="8"/><path d="M8 12h2.5M13.5 12H16M10 17h4"/><path d="M16 3h4l-4 4h4"/>' },
  '🔥': { label: 'on fire', d: '<path d="M12 22c-4 0-7-3-7-7 0-4 3-6 4-10 1 3 3 4 3 4s1-3 0-6c4 2 7 7 7 12 0 4-3 7-7 7z"/><path d="M12 22c-2 0-3-1.5-3-3.5S11 15 11 13c2 1 4 3 4 5.5S14 22 12 22z"/>' },
  '🤔': { label: 'thinking', d: '<circle cx="12" cy="12" r="9"/><path d="M8 9.5h2M14 9h2"/><path d="M9 16c2-1 4-1 6 0"/><path d="M17 3c1-1 3 0 2.5 1.5S17 6 17 7"/>' },
  '📚': { label: 'reading', d: '<path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v14c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v14"/>' },
};
export function moodHtml(mood?: string): string {
  if (!mood) return '';
  const key = [...mood.trim()][0] ?? '';
  const m = MOODS[mood.trim()] ?? MOODS[key];
  const label = m?.label ?? mood.trim();
  const d = m?.d ?? '<path d="M12 3l2.5 5.5 6 .7-4.5 4 1.3 6L12 16.3 6.7 19.2 8 13.2l-4.5-4 6-.7z"/>';
  return `<svg class="mood" viewBox="0 0 24 24" role="img" aria-label="Mood: ${label.replace(/"/g, '&quot;')}" focusable="false">${d}</svg>`;
}

export const SAMPLE_NOTE = '<span class="sample-note" role="note"><span class="sn-arrow" aria-hidden="true">↖</span>sample entry, replace me</span>';

/** Sticky-note colours cycled by index/hash. */
export const STICKY_COLORS = ['s-yellow', 's-pink', 's-blue', 's-green', 's-orange'] as const;
