import { hasGsap, prefersReducedMotion, toArray, whenReady, afterGate } from "./core.js";
import { SLIDE, splitLines } from "./split-lines.js";

/* SECTION REVEALS + UNDERLINE DRAW
   Mark elements in Webflow with a class or attribute (no code needed):
     has-label-anim    -> fades up
     has-heading-anim  -> heading, line by line (line slide)
     has-text-anim     -> fades up (the earlier copy animation)
     .underline_path   -> an SVG <path> that draws itself
   ...or list extra CSS selectors in the campaign entry (opts.label / heading / text)
   so nothing has to be added in the Designer.
   HEADINGS use the "line slide" from split-lines.js (matches gpcanada.ca): each line slides in from
   the left, skewed, with an expo-out ease, lines 0.1s apart. Labels and copy keep the earlier fade-up.
   Each group (a heading and the text that follows it) is ONE timeline, in page order, played once when
   the group's first element reaches "top 95%". Underlines inside a group join the sequence.
   Anything inside opts.exclude is skipped. */

const DEFAULTS = {
  label:   ".has-label-anim, [has-label-anim]",
  heading: ".has-heading-anim, [has-heading-anim]",
  text:    ".has-text-anim, [has-text-anim]",
  line:    ".underline_path",
  exclude: "[data-anim-skip]",
  start:   "top 95%",
  step:    SLIDE.step,
  gap:     { label: 0.25, text: 0.35, heading: 0.25, line: 0.3 }   // pause after each element (fade-up blocks)
};
const FADE_FROM = { autoAlpha: 0, y: 24 };

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
  const STEP = opts.step != null ? opts.step : DEFAULTS.step;
  const START = opts.start || DEFAULTS.start;
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
      const tl = gsap.timeline({ paused: true, scrollTrigger: { trigger: els[0], start: START, once: true } });
      const splits = [];
      let t = 0;
      els.forEach(function (el) {
        const k = kind(el);
        if (k === "line") {
          tl.set(el, { autoAlpha: 1 }, t).to(el, { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" }, t);
          t += DEFAULTS.gap.line;
        } else if (k === "heading") {
          const sp = splitLines(el);
          splits.push(sp);
          gsap.set(el, { autoAlpha: 1 });                  // the block shows; its lines start hidden
          gsap.set(sp.lines, Object.assign({}, SLIDE.from));
          sp.lines.forEach(function (ln, i) {
            if (i > 0) t += STEP;
            tl.to(ln, Object.assign({}, SLIDE.to), t);
          });
          t += DEFAULTS.gap.heading;
        } else {                                           // label / copy: the earlier fade-up
          tl.fromTo(el, FADE_FROM, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out" }, t);
          t += DEFAULTS.gap[k];
        }
      });
      tl.eventCallback("onComplete", function () { splits.forEach(function (sp) { sp.revert(); }); });
    });
    ScrollTrigger.refresh();
  }

  whenReady(function () { afterGate(build); });          // after the opening curtain, if there is one
}
