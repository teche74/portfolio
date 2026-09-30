/**
 * Hand-drawn SVG charts (rough.js), returned as HTML strings, so they work at build time
 * (set:html) and in the browser (live GitHub / LeetCode data on the Stats page).
 *
 * - rough.js runs in "generator" mode: no DOM, so the same code renders in Node. A seed
 *   derived from the chart title makes every build draw the exact same wobble.
 * - Colour comes from CSS custom properties. `var()` is not valid inside SVG presentation
 *   attributes, so every mark carries `style="stroke:…;fill:…"` instead.
 * - Ink draw-in: stroked marks have `pathLength="1"`; CSS dashes them out and draws them in
 *   when the figure gets the `in` class (motion layer). Without JS or under reduced motion
 *   they are simply drawn.
 * - Every chart ships a "Show data" table, and every mark has an invisible hit target with
 *   `data-tip` for the tooltip layer. Series also differ by hatch angle, never colour alone.
 */
import rough from 'roughjs';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const nf = new Intl.NumberFormat('en-IN');
export const fmtNum = (n: number, dec = 0) => (dec ? n.toFixed(dec) : nf.format(Math.round(n)));

/** Ink slots (see global.css `--ink-s1..8`). Fixed order, never cycled past 8. */
export const SERIES = (i: number) => `var(--ink-s${(i % 8) + 1})`;
export const OTHER = 'var(--ink-other)';

export interface Segment {
  label: string;
  value: number;
  color: string;
}

const gen = rough.generator();

/** Small stable string hash → rough.js seed (must be a positive int). */
function seedOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (Math.abs(h) % 2147483646) + 1;
}

/** rough.js emits 15 significant digits; one decimal is plenty and keeps pages small. */
const tidy = (d: string) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(parseFloat(n) * 10) / 10)).replace(/,\s+/g, ',');

type Drawable = ReturnType<typeof gen.line>;

/** Serialise a rough drawable to <path> elements. `cls` goes on each path. */
function paths(d: Drawable, cls = 'ink', extra = ''): string {
  return gen
    .toPaths(d)
    .map((p) => {
      const isFill = p.fill && p.fill !== 'none';
      const style = isFill ? `fill:${p.fill};stroke:none` : `stroke:${p.stroke};fill:none;stroke-width:${p.strokeWidth}`;
      const draw = isFill ? '' : ' pathLength="1"';
      return `<path class="${cls}${isFill ? ' ink-fill' : ''}" d="${tidy(p.d)}" style="${style}"${draw}${extra}/>`;
    })
    .join('');
}

function dataTable(caption: string, head: string[], rows: (string | number)[][]) {
  return `<details class="chart-table"><summary>Show data</summary><table><caption class="sr-only">${esc(caption)}</caption><thead><tr>${head
    .map((h) => `<th scope="col">${esc(h)}</th>`)
    .join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${esc(c)}</th>` : `<td>${esc(c)}</td>`)).join('')}</tr>`).join('')}</tbody></table></details>`;
}

/** Hatch angles cycle so neighbouring series differ by texture as well as ink. */
const HATCH = [-41, 45, 0, 90, -20, 20, 65, -65];

/** Annular sector as an SVG path (angles in radians, 0 = 12 o'clock, clockwise). */
function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(cx + r * Math.sin(a)).toFixed(2)} ${(cy - r * Math.cos(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p(r1, a0)} A${r1} ${r1} 0 ${large} 1 ${p(r1, a1)} L${p(r0, a1)} A${r0} ${r0} 0 ${large} 0 ${p(r0, a0)} Z`;
}

/**
 * Donut: hatched ring segments with a big centre value and a legend with direct values.
 * `countTo` is accepted for API compatibility (the old count-up) but the value is static.
 */
export function ringChart(opts: {
  segments: Segment[];
  centerValue: string | number;
  centerLabel: string;
  title: string;
  countTo?: number;
  thickness?: number;
  legend?: boolean;
  showPct?: boolean;
}): string {
  const segs = opts.segments.filter((s) => s.value > 0);
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  const seed = seedOf(opts.title);
  const R1 = 46;
  const R0 = R1 - (opts.thickness ?? 12) * 1.2;
  const gap = segs.length > 1 ? 0.035 : 0;
  let acc = 0;
  const marks = segs
    .map((s, i) => {
      const frac = s.value / total;
      const a0 = acc * Math.PI * 2 + gap / 2;
      const a1 = Math.max(a0 + 0.02, (acc + frac) * Math.PI * 2 - gap / 2);
      acc += frac;
      const d = sector(60, 60, R0, R1, a0, a1);
      const tip = `${s.label}: ${fmtNum(s.value)} (${(frac * 100).toFixed(1)}%)`;
      const drawn = paths(
        gen.path(d, {
          seed: seed + i,
          roughness: 1.1,
          bowing: 0.6,
          stroke: s.color,
          strokeWidth: 1.4,
          fill: s.color,
          fillStyle: 'hachure',
          hachureAngle: HATCH[i % HATCH.length],
          hachureGap: 2.6,
          fillWeight: 1.1,
        }),
        'ink',
      );
      return `<g class="seg" style="--i:${i}">${drawn}<path class="hit" d="${d}" data-tip="${esc(tip)}"><title>${esc(tip)}</title></path></g>`;
    })
    .join('');
  const outline = paths(gen.circle(60, 60, R1 * 2 + 6, { seed: seed + 99, roughness: 0.8, stroke: 'var(--graphite)', strokeWidth: 0.6 }), 'ink faint');
  const legend =
    opts.legend === false
      ? ''
      : `<ul class="chart-legend">${segs
          .map(
            (s, i) =>
              `<li><span class="sw" style="--sw:${s.color};--ha:${HATCH[i % HATCH.length]}deg" aria-hidden="true"></span><span class="lg-l">${esc(s.label)}</span><span class="lg-v">${fmtNum(s.value)}${opts.showPct ? ` · ${((s.value / total) * 100).toFixed(0)}%` : ''}</span></li>`,
          )
          .join('')}</ul>`;
  const summary = `${opts.title}: ${segs.map((s) => `${s.label} ${fmtNum(s.value)}`).join(', ')}`;
  return `<figure class="chart ring-chart" role="group" aria-label="${esc(opts.title)}">
  <div class="ring-wrap">
    <svg viewBox="0 0 120 120" role="img" aria-label="${esc(summary)}">${outline}${marks}</svg>
    <div class="ring-center" aria-hidden="true"><span class="ring-val">${esc(opts.centerValue)}</span><span class="ring-lbl">${esc(opts.centerLabel)}</span></div>
  </div>
  ${legend}
  ${dataTable(opts.title, ['Item', 'Value', 'Share'], segs.map((s) => [s.label, fmtNum(s.value), `${((s.value / total) * 100).toFixed(1)}%`]))}
</figure>`;
}

/** Nice round axis ticks. */
function ticks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  while (out[out.length - 1] < max - 1e-9) out.push(+(out[out.length - 1] + step).toFixed(6));
  return out;
}

export interface LinePoint {
  x: number; // e.g. epoch ms
  y: number;
  label: string; // tooltip title
  sub?: string; // tooltip extra line
}

/** Single-series pencil line: hand-ruled grid, the line in ink, dots, and a circled peak. */
export function lineChart(opts: { points: LinePoint[]; title: string; yLabel: string; xFormat?: (x: number) => string; height?: number }): string {
  const pts = [...opts.points].sort((a, b) => a.x - b.x);
  if (pts.length < 2) return '';
  const seed = seedOf(opts.title);
  const W = 640;
  const H = opts.height ?? 240;
  const padL = 46;
  const padR = 18;
  const padT = 26;
  const padB = 30;
  const ys = pts.map((p) => p.y);
  const yt = ticks(Math.min(...ys) - 20, Math.max(...ys) + 20, 4);
  const y0 = yt[0];
  const y1 = yt[yt.length - 1];
  const x0 = pts[0].x;
  const x1 = pts[pts.length - 1].x;
  const sx = (x: number) => padL + ((x - x0) / (x1 - x0 || 1)) * (W - padL - padR);
  const sy = (y: number) => padT + (1 - (y - y0) / (y1 - y0 || 1)) * (H - padT - padB);
  const peak = pts.reduce((a, b) => (b.y > a.y ? b : a));
  const xf = opts.xFormat ?? ((x: number) => new Date(x).getUTCFullYear().toString());
  const years = [...new Set(pts.map((p) => new Date(p.x).getUTCFullYear()))];
  const xl = years
    .map((yr) => {
      const t = Date.UTC(yr, 0, 1);
      const x = t < x0 ? x0 : t;
      return x <= x1 ? `<text class="axis-t" x="${sx(x).toFixed(1)}" y="${H - 8}" text-anchor="${x === x0 ? 'start' : 'middle'}">${esc(xf(x))}</text>` : '';
    })
    .join('');
  const grid = yt
    .map(
      (v, i) =>
        paths(gen.line(padL, sy(v), W - padR, sy(v), { seed: seed + 10 + i, roughness: 0.6, stroke: 'var(--rule)', strokeWidth: 0.8 }), 'ink faint') +
        `<text class="axis-t" x="${padL - 8}" y="${(sy(v) + 4).toFixed(1)}" text-anchor="end">${fmtNum(v)}</text>`,
    )
    .join('');
  const line = paths(
    gen.linearPath(
      pts.map((p) => [sx(p.x), sy(p.y)] as [number, number]),
      { seed, roughness: 0.9, bowing: 0.4, stroke: 'var(--ink-s1)', strokeWidth: 2 },
    ),
    'ink line',
  );
  const dots = pts.length <= 60 ? pts.map((p) => `<circle class="dot" cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="2.2"/>`).join('') : '';
  const pcx = sx(peak.x);
  const pcy = sy(peak.y);
  const ring = paths(gen.ellipse(pcx, pcy, 22, 18, { seed: seed + 7, roughness: 1.4, stroke: 'var(--ink-red)', strokeWidth: 1.4 }), 'ink peak');
  const hits = pts
    .map((p, i) => {
      const cx = sx(p.x);
      const left = i ? (sx(pts[i - 1].x) + cx) / 2 : padL;
      const right = i < pts.length - 1 ? (cx + sx(pts[i + 1].x)) / 2 : W - padR;
      const tip = `${p.label} — ${opts.yLabel} ${fmtNum(p.y)}${p.sub ? ` · ${p.sub}` : ''}`;
      return `<rect class="hit" x="${left.toFixed(1)}" y="${padT}" width="${Math.max(1, right - left).toFixed(1)}" height="${H - padT - padB}" data-tip="${esc(tip)}" data-cx="${cx.toFixed(1)}" data-cy="${sy(p.y).toFixed(1)}"><title>${esc(tip)}</title></rect>`;
    })
    .join('');
  const summary = `${opts.title}: ${pts.length} points from ${fmtNum(pts[0].y)} to ${fmtNum(pts[pts.length - 1].y)}, peak ${fmtNum(peak.y)} (${peak.label}).`;
  return `<figure class="chart line-chart" role="group" aria-label="${esc(opts.title)}">
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(summary)}" preserveAspectRatio="xMidYMid meet">
    ${grid}${xl}${line}${dots}${ring}
    <text class="peak-t" x="${Math.min(W - padR - 30, Math.max(padL + 30, pcx)).toFixed(1)}" y="${Math.max(12, pcy - 16).toFixed(1)}" text-anchor="middle">peak ${fmtNum(peak.y)}</text>
    <line class="xhair" x1="0" x2="0" y1="${padT}" y2="${H - padB}"/>
    <circle class="xdot" r="5" cx="-20" cy="-20"/>
    <g class="hits">${hits}</g>
  </svg>
  ${dataTable(opts.title, ['Point', opts.yLabel], pts.map((p) => [p.label, fmtNum(p.y)]))}
</figure>`;
}

export interface BarDatum {
  label: string;
  /** one value per series */
  values: number[];
  tip?: string;
}

/**
 * Vertical bars, hatched in ink: single series, or stacked when `series` has more than one
 * entry (each series gets its own hatch angle). Totals are pencilled above the bars.
 */
export function barChart(opts: {
  data: BarDatum[];
  series: { label: string; color: string }[];
  title: string;
  unit?: string;
  height?: number;
  labels?: boolean;
  decimals?: number;
}): string {
  const { data, series } = opts;
  if (!data.length) return '';
  const seed = seedOf(opts.title);
  const W = 640;
  const H = opts.height ?? 200;
  const padL = 36;
  const padR = 8;
  const padT = 24;
  const padB = 28;
  const totals = data.map((d) => d.values.reduce((s, v) => s + (v || 0), 0));
  const max = Math.max(1, ...totals);
  const yt = ticks(0, max, 3);
  const top = yt[yt.length - 1] || max;
  const band = (W - padL - padR) / data.length;
  const bw = Math.min(40, band * 0.66);
  const sy = (v: number) => (v / top) * (H - padT - padB);
  const unit = opts.unit ? ` ${opts.unit}` : '';
  const dec = opts.decimals ?? 0;
  const many = data.length > 20;
  const grid = yt
    .map((v, i) => {
      const y = H - padB - sy(v);
      return (
        (i ? paths(gen.line(padL, y, W - padR, y, { seed: seed + 50 + i, roughness: 0.5, stroke: 'var(--rule)', strokeWidth: 0.8 }), 'ink faint') : '') +
        `<text class="axis-t" x="${padL - 6}" y="${(y + 4).toFixed(1)}" text-anchor="end">${fmtNum(v)}</text>`
      );
    })
    .join('');
  const axis = paths(gen.line(padL - 4, H - padB, W - padR, H - padB, { seed: seed + 3, roughness: 0.8, stroke: 'var(--graphite)', strokeWidth: 1.2 }), 'ink');
  const every = Math.ceil(data.length / 12);
  const bars = data
    .map((d, i) => {
      const x = padL + band * i + (band - bw) / 2;
      let y = H - padB;
      const segs = d.values
        .map((v, s) => {
          if (!v) return '';
          const h = sy(v);
          y -= h;
          const col = series[s]?.color ?? SERIES(s);
          return paths(
            gen.rectangle(x, y, bw, Math.max(1, h - (s > 0 ? 1.5 : 0)), {
              seed: seed + i * 7 + s,
              roughness: many ? 0.6 : 1,
              stroke: col,
              strokeWidth: many ? 0.9 : 1.2,
              fill: col,
              fillStyle: many ? 'solid' : 'hachure',
              hachureAngle: HATCH[s % HATCH.length],
              hachureGap: Math.max(2.4, bw / 7),
              fillWeight: 1.2,
            }),
            'ink',
          );
        })
        .join('');
      const total = totals[i];
      const lbl =
        opts.labels !== false && total
          ? `<text class="bar-t" x="${(x + bw / 2).toFixed(1)}" y="${(H - padB - sy(total) - 7).toFixed(1)}" text-anchor="middle">${fmtNum(total, dec)}</text>`
          : '';
      const xl = i % every === 0 ? `<text class="axis-t" x="${(x + bw / 2).toFixed(1)}" y="${H - 9}" text-anchor="middle">${esc(d.label)}</text>` : '';
      const tip = d.tip ?? (series.length > 1 ? `${d.label}: ${d.values.map((v, s) => `${series[s]?.label ?? ''} ${fmtNum(v || 0, dec)}`).join(', ')}` : `${d.label}: ${fmtNum(total, dec)}${unit}`);
      const hit = `<rect class="hit" x="${(padL + band * i).toFixed(1)}" y="${padT}" width="${band.toFixed(1)}" height="${H - padT - padB}" data-tip="${esc(tip)}"><title>${esc(tip)}</title></rect>`;
      return `<g class="bar" style="--i:${i}">${segs}${lbl}${xl}${hit}</g>`;
    })
    .join('');
  const legend =
    series.length > 1
      ? `<ul class="chart-legend row">${series.map((s, i) => `<li><span class="sw" style="--sw:${s.color};--ha:${HATCH[i % HATCH.length]}deg" aria-hidden="true"></span><span class="lg-l">${esc(s.label)}</span></li>`).join('')}</ul>`
      : '';
  const summary = `${opts.title}: ${data.map((d, i) => `${d.label} ${fmtNum(totals[i], dec)}`).join(', ')}`;
  const head = ['', ...(series.length > 1 ? series.map((s) => s.label) : [opts.unit ?? 'Value'])];
  const rows = data.map((d) => [d.label, ...(series.length > 1 ? d.values.map((v) => fmtNum(v || 0, dec)) : [fmtNum(d.values[0] || 0, dec)])]);
  return `<figure class="chart bar-chart" role="group" aria-label="${esc(opts.title)}">
  ${legend}
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(summary)}">${grid}${bars}${axis}</svg>
  ${dataTable(opts.title, head, rows)}
</figure>`;
}

/**
 * Horizontal highlighter rows (label · swipe · value). Plain HTML so it stays light; the
 * swipe is drawn in by CSS on reveal.
 */
export function meterRows(rows: { label: string; value: number; max: number; color?: string; valueText?: string }[], title: string): string {
  return `<div class="chart meters" role="list" aria-label="${esc(title)}">${rows
    .map((r, i) => {
      const pct = r.max ? Math.min(100, (r.value / r.max) * 100) : 0;
      const vt = r.valueText ?? fmtNum(r.value);
      return `<div class="meter-row" role="listitem" data-tip="${esc(`${r.label}: ${vt}`)}"><span class="m-l">${esc(r.label)}</span><span class="m-bar" aria-hidden="true"><span style="--w:${pct.toFixed(1)}%;--i:${i};--c:${r.color ?? 'var(--ink-s1)'}"></span></span><span class="m-v">${esc(vt)}</span></div>`;
    })
    .join('')}</div>`;
}
