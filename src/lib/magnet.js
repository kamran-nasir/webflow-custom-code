import { hasGsap, prefersReducedMotion, toArray, whenReady } from "./core.js";

/* MAGNETIC BUTTON
   The element is pulled toward the pointer while the pointer is near it and springs back when it leaves.
   Only the listed elements react; nothing else on the page moves with the mouse.

   magnet({ items: ".play-button",     // elements that get pulled
            strength: 0.35,            // how far they follow the pointer (0.35 = 35% of the distance)
            reach: 1.1,                // activation distance in element sizes (1.1 = within about one button width of its edge)
            inner: ".play-icon" })     // optional: an inner element that follows a little more, for depth

   Touch devices and reduced motion: off. */
export function magnet(opts) {
  opts = opts || {};
  if (!hasGsap(false) || prefersReducedMotion()) return;
  if (window.matchMedia && !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const gsap = window.gsap;
  const strength = opts.strength != null ? opts.strength : 0.35;
  const reach = opts.reach != null ? opts.reach : 1.1;
  whenReady(function () {
    toArray(opts.items).forEach(function (el) {
      const inner = opts.inner ? el.querySelector(opts.inner) : null;
      let active = false;
      // plain tweens with overwrite (not quickTo): a spring-back tween would otherwise kill quickTo's tween and the pull would stop working
      const to = function (t, x, y, d, ease) { gsap.to(t, { x: x, y: y, duration: d, ease: ease, overwrite: true }); };
      window.addEventListener("pointermove", function (e) {
        const r = el.getBoundingClientRect();
        // use the un-pulled centre so the pull does not feed back into the distance
        const cx = r.left + r.width / 2 - (gsap.getProperty(el, "x") || 0), cy = r.top + r.height / 2 - (gsap.getProperty(el, "y") || 0);
        const dx = e.clientX - cx, dy = e.clientY - cy, lim = Math.max(r.width, r.height) * (0.5 + reach);
        if (Math.hypot(dx, dy) < lim) {
          active = true; to(el, dx * strength, dy * strength, 0.5, "power3.out");
          if (inner) to(inner, dx * strength * 0.5, dy * strength * 0.5, 0.6, "power3.out");
        } else if (active) {
          active = false; to(el, 0, 0, 0.9, "elastic.out(1, 0.4)");
          if (inner) to(inner, 0, 0, 0.9, "elastic.out(1, 0.4)");
        }
      }, { passive: true });
    });
  });
}
