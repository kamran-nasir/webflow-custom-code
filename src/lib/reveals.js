import { hasGsap, prefersReducedMotion, toArray, whenReady } from "./core.js";

/* SECTION REVEALS + UNDERLINE DRAW
   Mark elements in Webflow with a class or attribute (no code needed):
     has-label-anim    -> fades up
     has-heading-anim  -> letters pop in (SplitText), falls back to fade up
     has-text-anim     -> fades up
     .underline_path   -> an SVG <path> that draws itself
   ...or list extra CSS selectors in the campaign entry (opts.label / heading / text)
   so nothing has to be added in the Designer.
   Each section plays once when it scrolls into view. Elements animate one by one in page
   order, each starting a little before the previous one finishes. Underlines inside such a
   section join the sequence (drawn right after the heading above them). Lines elsewhere draw
   on their own when scrolled to. Anything inside opts.exclude is skipped (e.g. the hero). */

const DEFAULTS = {
  label:   ".has-label-anim, [has-label-anim]",
  heading: ".has-heading-anim, [has-heading-anim]",
  text:    ".has-text-anim, [has-text-anim]",
  line:    ".underline_path",
  exclude: "[data-anim-skip]",
  start:   "top 75%",
  gap:     { label: 0.25, text: 0.35, heading: 0.6, line: 0.3 }
};

function join(base, extra) { return extra ? base + "," + extra : base; }

export function reveals(opts) {
  opts = opts || {};
  if (!hasGsap(true)) return;
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  if (prefersReducedMotion()) return;

  const SEL = {
    label:   join(DEFAULTS.label,   opts.label),
    heading: join(DEFAULTS.heading, opts.heading),
    text:    join(DEFAULTS.text,    opts.text),
    line:    join(DEFAULTS.line,    opts.line)
  };
  const exclude = join(DEFAULTS.exclude, opts.exclude);
  const GAP = Object.assign({}, DEFAULTS.gap, opts.gap || {});
  const START = opts.start || DEFAULTS.start;
  const FADE_FROM = { autoAlpha: 0, y: 24 };
  const included = function (el) { return !el.closest(exclude); };
  const sectionOf = function (el) { return el.closest("section, [data-anim-section]"); };

  const all = toArray(SEL.label + "," + SEL.heading + "," + SEL.text).filter(included);   // document order
  const allLines = toArray(SEL.line).filter(included);

  // Lines whose section has no text reveals draw on their own when scrolled to
  allLines.forEach(function (path) {
    const section = sectionOf(path);
    if (section && all.some(function (el) { return sectionOf(el) === section; })) return;
    if (!path.getTotalLength) return;
    const length = path.getTotalLength();
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, autoAlpha: 0 });   // hidden: round caps leave a dot
    gsap.to(path, {
      strokeDashoffset: 0, duration: 1.2, ease: "power2.out",
      onStart: function () { gsap.set(path, { autoAlpha: 1 }); },
      scrollTrigger: { trigger: path, start: "top 85%", toggleActions: "play none none none" }
    });
  });

  if (!all.length) return;
  gsap.set(all, { autoAlpha: 0 });                      // hide now so nothing flashes

  // Group by section (or by parent when an element is not inside a <section>)
  const groups = new Map();
  all.forEach(function (el) {
    const key = sectionOf(el) || el.parentElement;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(el);
  });
  groups.forEach(function (els, section) {
    if (!section.matches || !section.matches("section, [data-anim-section]")) return;
    const lines = allLines.filter(function (p) { return sectionOf(p) === section && p.getTotalLength; });
    if (!lines.length) return;
    lines.forEach(function (p) {
      const len = p.getTotalLength();
      gsap.set(p, { strokeDasharray: len, strokeDashoffset: len, autoAlpha: 0 });
    });
    groups.set(section, els.concat(lines).sort(function (a, b) {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    }));
  });

  const kind = function (el) {
    if (el.matches(SEL.line))    return "line";
    if (el.matches(SEL.heading)) return "heading";
    if (el.matches(SEL.label))   return "label";
    return "text";
  };

  function build() {
    groups.forEach(function (els, section) {
      const tl = gsap.timeline({ paused: true, scrollTrigger: { trigger: section, start: START, once: true } });
      let t = 0;
      els.forEach(function (el) {
        const k = kind(el);
        if (k === "line") {
          tl.set(el, { autoAlpha: 1 }, t).to(el, { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" }, t);
        } else if (k === "heading" && window.SplitText) {
          const chars = new window.SplitText(el, { type: "words,chars", wordsClass: "reveal-word", charsClass: "reveal-char" }).chars;
          gsap.set(el, { autoAlpha: 1 });
          gsap.set(chars, { autoAlpha: 0, yPercent: 60, scale: 0.5 });
          tl.to(chars, {
            autoAlpha: 1, yPercent: 0, scale: 1, duration: 1.5, ease: "elastic.out(1, 0.55)",
            stagger: { amount: Math.min(chars.length * 0.04, 0.9) }          // long headings don't drag on
          }, t);
        } else {
          tl.fromTo(el, FADE_FROM, { autoAlpha: 1, y: 0, duration: k === "heading" ? 0.9 : 0.8, ease: "power3.out" }, t);
        }
        t += GAP[k];
      });
    });
    ScrollTrigger.refresh();
  }

  whenReady(build);
}
