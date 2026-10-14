/**
 * Parse a hand-written worked solution into blocks a browser can lay out.
 *
 * The solutions in this bank were authored as plain text in a fixed-width
 * editor, which leaves two marks on them that a <pre> would faithfully — and
 * uselessly — reproduce:
 *
 *   1. prose is hard-wrapped at about 88 columns, so every wrap would show as
 *      a line break in the middle of a sentence;
 *   2. emphasis is markdown (`**bold**`), so the asterisks would show as
 *      asterisks.
 *
 * Both are artefacts of authoring, not of meaning. This module recovers the
 * intended structure from four conventions the solutions follow without
 * exception:
 *
 *   heading   a line whose leading bold run ends in a full stop —
 *             `**Step 1 — state the law.**`, `**Why the sign matters.**`
 *   formula   a short line standing alone, usually containing `=`
 *   answer    the closing line, opening with `∴`
 *   note      a paragraph opening `Note:`, which flags a corrected answer key
 *
 * Anything else is prose, and a prose line that was wrapped (i.e. the previous
 * line ran long) is folded back onto the line before it.
 */

export type Span =
  | { t: 'text'; v: string }
  | { t: 'b'; v: string }
  | { t: 'i'; v: string }
  | { t: 'sub'; base: string; sub: string }
  | { t: 'ok' }
  | { t: 'no' };

export type Block =
  | { k: 'head'; title: Span[]; body: Span[] }
  | { k: 'formula'; body: Span[] }
  | { k: 'answer'; body: Span[] }
  | { k: 'note'; body: Span[] }
  | { k: 'prose'; body: Span[] };

/** Below this, a line ended because the author meant it to. */
const WRAP_AT = 70;

/** `**Step 1 — do the thing.**` — the bold run closes with a full stop. */
const HEADING = /^\*\*(.+?[.:])\*\*\s*/;

/**
 * ` x ` is multiplication when it sits between two quantities, and a variable
 * everywhere else. Requiring a digit (or a closing bracket, or a superscript)
 * on the left and a digit-like token on the right keeps `3 x 10⁻²³` apart from
 * `**x**, **y** and **z**`.
 */
function times(s: string): string {
  return s.replace(
    /([\d)\]⁰¹²³⁴⁵⁶⁷⁸⁹½⅓⅔¼¾])\s+x\s+(?=[\d(√½⅓⅔¼¾])/g,
    '$1 × ',
  );
}

/** A lone hyphen between spaces is an em dash in this prose, not a minus. */
function dashes(s: string): string {
  return s.replace(/ - /g, ' — ');
}

/**
 * `v_rms`, `C_V`, `E_n`, `λ_m` — an underscore subscript, written the way one
 * writes it in plain text. Split so the browser can set it as a real subscript.
 */
const SUBSCRIPT = /([A-Za-zλμνσρθΔ][A-Za-z]?)_([A-Za-z0-9]{1,4})\b/g;

/** Walk plain text, lifting `x_y` out as subscript spans. */
function withSubscripts(src: string, push: (s: Span) => void): void {
  let last = 0;
  let m: RegExpExecArray | null;
  SUBSCRIPT.lastIndex = 0;
  while ((m = SUBSCRIPT.exec(src))) {
    if (m.index > last) push({ t: 'text', v: src.slice(last, m.index) });
    push({ t: 'sub', base: m[1], sub: m[2] });
    last = SUBSCRIPT.lastIndex;
  }
  if (last < src.length) push({ t: 'text', v: src.slice(last) });
}

/** Split inline markup into spans. Handles `**bold**`, `*italic*`, ✓ and ✗. */
export function spans(src: string): Span[] {
  const out: Span[] = [];
  const push = (s: Span) => out.push(s);
  // Bold first: `*italic*` inside `**bold**` is common in these solutions, and
  // matching the double marker first stops it being read as two italics.
  //
  // The italic arm is deliberately narrow. Organic chemistry writes an isotopic
  // label as a bare asterisk — `Ph–CO–*CH₂–COOH` — so a permissive `\*(.+?)\*`
  // devours half a reaction scheme. Restricting the content to plain letters
  // and spaces matches the real uses (`temperature *is* kinetic energy`) and
  // leaves labelled carbons alone, since `CH₂` carries a subscript digit.
  const rx = /\*\*(.+?)\*\*|(?<![A-Za-z0-9*])\*([A-Za-z][A-Za-z ']{0,40})\*(?![A-Za-z0-9*])|([✓✗])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(src))) {
    if (m.index > last) withSubscripts(src.slice(last, m.index), push);
    if (m[1] !== undefined) out.push({ t: 'b', v: m[1] });
    else if (m[2] !== undefined) out.push({ t: 'i', v: m[2] });
    else out.push(m[3] === '✓' ? { t: 'ok' } : { t: 'no' });
    last = rx.lastIndex;
  }
  if (last < src.length) withSubscripts(src.slice(last), push);
  // `\*` is a literal asterisk the author escaped — an isotopic label, almost
  // always. Unescaped last, so the markup pass above never sees it as a marker.
  for (const s of out) {
    if (s.t === 'text' || s.t === 'b' || s.t === 'i') s.v = s.v.replace(/\\\*/g, '*');
  }
  return out.filter((s) => s.t !== 'text' || s.v !== '');
}

/**
 * A standalone short line carrying a relation is displayed as a formula rather
 * than run into the prose. Checked only on lines that were *not* folded into a
 * paragraph, so a sentence with an equation inside it stays a sentence.
 */
function isFormula(line: string): boolean {
  const bare = line.replace(/\*\*/g, '').replace(/[✓✗]\s*$/, '').trim();
  if (!bare || bare.length > WRAP_AT) return false;
  if (!/[=∝→≈<>≤≥]/.test(bare)) return false;
  // a relation smothered in words is a sentence, not a display formula
  const words = bare.split(/\s+/).filter((w) => /^[A-Za-z][a-z]{2,}$/.test(w));
  return words.length <= 4;
}

/** Fold hard wraps back into paragraphs, keeping deliberate breaks. */
function unwrap(text: string): { line: string; folded: boolean }[] {
  const raw = text.replace(/\r\n?/g, '\n').split('\n');
  const out: { line: string; folded: boolean }[] = [];
  for (const r of raw) {
    const line = r.trim();
    if (!line) continue;
    const prev = out[out.length - 1];
    const startsBlock = HEADING.test(line) || line.startsWith('∴') || /^Note:/.test(line);
    const prevOpen =
      prev &&
      prev.line.length >= WRAP_AT &&
      !/[✓✗]$/.test(prev.line) &&
      !prev.line.endsWith(':');
    if (prev && prevOpen && !startsBlock) {
      prev.line += ' ' + line;
      prev.folded = true;
    } else {
      out.push({ line, folded: false });
    }
  }
  return out;
}

export function parseSolution(text: string): Block[] {
  const lines = unwrap(text);
  const blocks: Block[] = [];
  for (const { line, folded } of lines) {
    const pretty = dashes(times(line));
    const head = HEADING.exec(line);
    if (head) {
      const rest = line.slice(head[0].length).trim();
      blocks.push({
        k: 'head',
        title: spans(dashes(head[1])),
        body: spans(dashes(times(rest))),
      });
    } else if (line.startsWith('∴')) {
      blocks.push({ k: 'answer', body: spans(dashes(times(line.replace(/^∴\s*/, '')))) });
    } else if (/^Note:/.test(line)) {
      blocks.push({ k: 'note', body: spans(dashes(times(line.replace(/^Note:\s*/, '')))) });
    } else if (!folded && isFormula(line)) {
      blocks.push({ k: 'formula', body: spans(pretty) });
    } else {
      blocks.push({ k: 'prose', body: spans(pretty) });
    }
  }
  return blocks;
}
