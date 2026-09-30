/**
 * Sätteri hast plugins (Astro 7's default Markdown processor): GFM footnotes become
 * pencilled margin notes ("sidenotes").
 *
 * Pass 1 reads the footnotes <section> and stores each note's inline content.
 * Pass 2 inserts, right after every footnote reference <sup>, a
 *   <span class="sidenote" role="note" id="sn-N"><span class="sn-num">N</span> …note…</span>
 * and tags the <sup> with class "fn-ref" + data-sn. The footnotes <section> stays in the HTML
 * with the extra class "footnotes-fallback" (shown on narrow screens / without CSS).
 * CSS floats the notes into the margin at >= 1100px; blog/[...slug].astro toggles them on phones.
 */
const isEl = (n, tag) => n && n.type === 'element' && (!tag || n.tagName === tag);
const has = (n, prop) => isEl(n) && n.properties && n.properties[prop] !== undefined && n.properties[prop] !== false;
const clone = (n) => JSON.parse(JSON.stringify(n));

function walk(node, fn) {
  fn(node);
  if (node.children) for (const c of node.children) walk(c, fn);
}

const collect = {
  name: 'sidenotes-collect',
  element: {
    filter: ['section'],
    visit(node, ctx) {
      if (!has(node, 'dataFootnotes')) return;
      const notes = {};
      walk(clone(node), (n) => {
        if (!isEl(n, 'li') || !n.properties?.id) return;
        const inline = [];
        for (const c of n.children ?? []) {
          const parts = isEl(c, 'p') ? (c.children ?? []) : [c];
          for (const p of parts) {
            if (has(p, 'dataFootnoteBackref')) continue;
            if (p.type === 'text' && !p.value.trim() && !inline.length) continue;
            inline.push(p);
          }
          if (inline.length) inline.push({ type: 'text', value: ' ' });
        }
        while (inline.length && inline[inline.length - 1].type === 'text' && !inline[inline.length - 1].value.trim()) inline.pop();
        const last = inline[inline.length - 1];
        if (last && last.type === 'text') last.value = last.value.replace(/\s+$/, '');
        notes[String(n.properties.id)] = inline;
      });
      ctx.data.sidenotes = notes;
      const cls = node.properties.className;
      ctx.setProperty(node, 'className', [...(Array.isArray(cls) ? cls : cls ? [cls] : []), 'footnotes-fallback']);
    },
  },
};

const insert = {
  name: 'sidenotes-insert',
  element: {
    filter: ['sup'],
    visit(node, ctx) {
      const notes = ctx.data.sidenotes;
      if (!notes) return;
      const a = (node.children ?? []).find((c) => has(c, 'dataFootnoteRef'));
      if (!a) return;
      const key = String(a.properties.href ?? '').replace(/^#/, '');
      const content = notes[key];
      if (!content) return;
      const label = (a.children ?? []).map((c) => (c.type === 'text' ? c.value : '')).join('') || '*';
      ctx.setProperty(node, 'className', ['fn-ref']);
      ctx.setProperty(node, 'dataSn', `sn-${key}`);
      ctx.insertAfter(node, {
        type: 'element',
        tagName: 'span',
        properties: { className: ['sidenote'], role: 'note', id: `sn-${key}` },
        children: [
          { type: 'element', tagName: 'span', properties: { className: ['sn-num'], ariaHidden: 'true' }, children: [{ type: 'text', value: label }] },
          { type: 'text', value: ' ' },
          ...clone(content),
        ],
      });
    },
  },
};

export const satteriSidenotes = [collect, insert];
export default satteriSidenotes;
