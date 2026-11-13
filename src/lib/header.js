import { hasGsap, prefersReducedMotion, first, whenReady, startAtTop } from "./core.js";

/* HIDING HEADER
   A fixed header that slides out of view when you scroll down and slides back in when you scroll up.
   It is always shown near the top of the page and while something inside it has keyboard focus.

   hideHeader({ header: ".nav", offset: 120, duration: 0.4, solidAt: 24 })   // solidAt: scroll distance (px) after which the class is-scrolled is added

   Make the header position:fixed (with its background) in Webflow; this only moves it.
   Reduced motion: the header just stays put. */
export function hideHeader(opts) {
  opts = opts || {};
  startAtTop();
  const el = first(opts.header);
  if (!el) return;
  const solid = function () { el.classList.toggle("is-scrolled", window.scrollY > (opts.solidAt != null ? opts.solidAt : 24)); };   // header turns solid once the page is scrolled (style .is-scrolled in Webflow/head CSS)
  window.addEventListener("scroll", solid, { passive: true }); solid();
  if (!hasGsap(true) || prefersReducedMotion()) return;
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  const offset = opts.offset != null ? opts.offset : 120;
  const dur = opts.duration != null ? opts.duration : 0.4;
  const root = document.documentElement;
  const isHidden = function () { return gsap.getProperty(el, "yPercent") < -50; };
  let hidden = false, lastY = window.scrollY, acc = 0, wasIntro = true;
  const set = function (hide, force) {
    if (hide === hidden && !force) return;
    hidden = hide;
    gsap.to(el, { yPercent: hide ? -100 : 0, duration: dur, ease: "power3.inOut", overwrite: "auto" });
  };
  // Decides from the REAL scroll movement, never from a stale flag:
  //  - while the page intro plays it owns the header (no fighting over its slide-down);
  //  - near the top the header is always shown (and forced back if it is somehow hidden);
  //  - a big jump (a pinned section released, an anchor link, a refresh) is not a "scroll direction", so it never hides the header;
  //  - small jitter is ignored: it takes ~6 px of steady movement to flip.
  const check = function (y) {
    const intro = root.classList.contains("hero-intro");
    if (intro) { lastY = y; acc = 0; wasIntro = true; return; }
    if (wasIntro) { wasIntro = false; hidden = isHidden(); }                 // intro just ended: take over from what is really on screen
    const d = y - lastY; lastY = y;
    if (y < offset) { acc = 0; if (hidden || isHidden()) set(false, true); return; }
    if (Math.abs(d) > 600) { acc = 0; return; }
    if (d * acc < 0) acc = 0;
    acc += d;
    if (acc > 6) { acc = 0; set(true); }
    else if (acc < -6) { acc = 0; set(false); }
  };
  whenReady(function () {
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: function (self) { check(self.scroll()); } });
    ScrollTrigger.addEventListener("refresh", function () { check(window.scrollY); });
    window.addEventListener("pageshow", function () { set(false, true); });
    el.addEventListener("focusin", function () { set(false); });
  });
}
