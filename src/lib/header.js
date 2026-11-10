import { hasGsap, prefersReducedMotion, first, whenReady } from "./core.js";

/* HIDING HEADER
   A fixed header that slides out of view when you scroll down and slides back in when you scroll up.
   It is always shown near the top of the page and while something inside it has keyboard focus.

   hideHeader({ header: ".nav", offset: 120, duration: 0.4, solidAt: 24 })   // solidAt: scroll distance (px) after which the class is-scrolled is added

   Make the header position:fixed (with its background) in Webflow; this only moves it.
   Reduced motion: the header just stays put. */
export function hideHeader(opts) {
  opts = opts || {};
  const el = first(opts.header);
  if (!el) return;
  const solid = function () { el.classList.toggle("is-scrolled", window.scrollY > (opts.solidAt != null ? opts.solidAt : 24)); };   // header turns solid once the page is scrolled (style .is-scrolled in Webflow/head CSS)
  window.addEventListener("scroll", solid, { passive: true }); solid();
  if (!hasGsap(true) || prefersReducedMotion()) return;
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  const offset = opts.offset != null ? opts.offset : 120;
  const dur = opts.duration != null ? opts.duration : 0.4;
  let hidden = false;
  const set = function (hide) {
    if (hide === hidden) return;
    hidden = hide;
    gsap.to(el, { yPercent: hide ? -100 : 0, duration: dur, ease: "power3.inOut", overwrite: "auto" });
  };
  whenReady(function () {
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: function (self) {
        if (self.scroll() < offset) set(false);
        else if (self.direction === 1) set(true);
        else if (self.direction === -1) set(false);
      }
    });
    el.addEventListener("focusin", function () { set(false); });
  });
}
