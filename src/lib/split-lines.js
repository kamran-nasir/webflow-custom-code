/* LINE SLIDE (the reference "line reveal")
   Splits a text block into its visual lines (SplitText) so each line can slide in on its own.
   Matches the gpcanada.ca text effect: every line starts shifted a full line-width to the left,
   skewed -60deg and transparent, then eases to rest (power3.out, 1.3s) with lines 0.18s apart.
   No clipping mask, no letters: it works the same for headings, sub-headings and paragraphs. */
export const SLIDE = {
  from: { x: "-100%", skewX: -60, autoAlpha: 0 },
  to:   { x: 0, skewX: 0, autoAlpha: 1, duration: 1.3, ease: "power3.out" },
  step: 0.18
};

/* Centred text has no "side" to slide in from: it rises from below instead (same ease, duration and stagger). */
export const RISE = { from: { y: 40, autoAlpha: 0 } };
export function slideFrom(el) {
  return getComputedStyle(el).textAlign === "center" ? RISE.from : SLIDE.from;
}

/* -> { lines: Element[], revert: fn }  (falls back to the element itself without SplitText) */
export function splitLines(el) {
  if (!window.SplitText) return { lines: [el], revert: function () {} };
  const s = new window.SplitText(el, { type: "lines", linesClass: "line" });
  return { lines: s.lines.length ? s.lines : [el], revert: function () { s.revert(); } };
}
