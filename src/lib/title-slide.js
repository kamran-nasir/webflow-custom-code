import { hasGsap, prefersReducedMotion, toArray, whenReady, afterGate } from "./core.js";
import { SLIDE, splitLines } from "./split-lines.js";

/* TITLE SLIDE
   The hero headline's line slide (see split-lines.js), on any other titles, each one played on its own when it scrolls into view
   (the section headings are already handled by reveals.js; use this for card titles, form titles ...).

   titleSlide({ items: ".card-title, .step-title", start: "top 88%" })

   The Webflow <head> hides them first (html.anim-hide <selectors> { visibility: hidden }, see head.html), so nothing flashes.
   Reduced motion / no GSAP: the titles stay as they are. */
export function titleSlide(opts) {
  opts = opts || {};
  if (!hasGsap(true) || prefersReducedMotion()) return;
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  const els = toArray(opts.items);
  if (!els.length) return;
  gsap.set(els, { autoAlpha: 0 });                       // hide now so nothing flashes

  whenReady(function () {
    afterGate(function () {                               // after the opening curtain / hero intro gate, if any
      els.forEach(function (el) {
        const sp = splitLines(el);
        gsap.set(el, { autoAlpha: 1 });                   // the block shows; its lines start hidden
        gsap.set(sp.lines, Object.assign({}, SLIDE.from));
        ScrollTrigger.create({
          trigger: el, start: opts.start || "top 88%", once: true,
          onEnter: function () {
            gsap.to(sp.lines, Object.assign({}, SLIDE.to, { stagger: SLIDE.step, onComplete: function () { sp.revert(); } }));
          }
        });
      });
      ScrollTrigger.refresh();
    });
  });
}
