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
    window.gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    window.gsap.ticker.lagSmoothing(0);
  } else {
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
  }
  return lenis;
}
