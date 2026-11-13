import { prefersReducedMotion } from "./core.js";

// Lenis smooth scroll, kept in sync with ScrollTrigger. Skipped for reduced motion.
export function smoothScroll(opts) {
  opts = opts || {};
  if (prefersReducedMotion()) return null;
  if (typeof window.Lenis === "undefined") return null;

  const lenis = new window.Lenis({
    lerp: opts.lerp != null ? opts.lerp : 0.1,   // lower = smoother/slower (0.05-0.15)
    wheelMultiplier: opts.wheelMultiplier != null ? opts.wheelMultiplier : 1,
    smoothWheel: true,
    anchors: opts.anchors !== false               // nav links like #faq scroll smoothly
  });
  window.lenis = lenis;                           // lenis.stop(), lenis.start(), lenis.scrollTo("#faq")

  if (window.gsap && window.ScrollTrigger) {
    lenis.on("scroll", window.ScrollTrigger.update);
    // Lenis moves by an amount that grows with the time since the last frame. After a long frame (a ScrollTrigger refresh, e.g. when a pinned
    // section is released, can take 300 ms) that one big time step made the scroll LUNGE forward by hundreds of px ("jumps to another section").
    // So Lenis gets its own clock that advances by at most 40 ms per frame, whatever really passed.
    let last = null, clock = 0;
    window.gsap.ticker.add(function (time) {
      const now = time * 1000;
      if (last === null) { last = now; clock = now; }
      clock += Math.min(now - last, 40);
      last = now;
      lenis.raf(clock);
    });
    window.gsap.ticker.lagSmoothing(0);
  } else {
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
  }
  return lenis;
}
