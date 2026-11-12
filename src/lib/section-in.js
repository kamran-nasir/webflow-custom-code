import { hasGsap, prefersReducedMotion, toArray, whenReady } from "./core.js";

/* SECTION IN
   A whole section starts invisible and fades in (once) as it scrolls into view, so a section with its own background does not pop
   in as a hard edge when the section above it (e.g. a pinned one) lets go. The things inside the section keep their own scroll
   triggers; start those later than this one so they play after the fade has begun.

   sectionIn({ items: ".values", start: "top 92%", duration: 0.9 })   // a config or an array of configs

   Reduced motion / no GSAP: the section is left alone (always visible). */
export function sectionIn(opts) {
  opts = opts || {};
  if (!hasGsap(true) || prefersReducedMotion()) return;
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  const els = toArray(opts.items);
  if (!els.length) return;
  whenReady(function () {
    els.forEach(function (el) {
      gsap.set(el, { opacity: 0 });
      ScrollTrigger.create({
        trigger: el, start: opts.start || "top 92%", once: true,
        onEnter: function () { gsap.to(el, { opacity: 1, duration: opts.duration != null ? opts.duration : 0.9, ease: "power2.out", clearProps: "opacity" }); }
      });
    });
  });
}
