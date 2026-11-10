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
      const qx = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" }), qy = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      const ix = inner ? gsap.quickTo(inner, "x", { duration: 0.6, ease: "power3.out" }) : null, iy = inner ? gsap.quickTo(inner, "y", { duration: 0.6, ease: "power3.out" }) : null;
      let active = false;
      window.addEventListener("pointermove", function (e) {
        const r = el.getBoundingClientRect();
        // use the un-pulled centre so the pull does not feed back into the distance
        const cx = r.left + r.width / 2 - (gsap.getProperty(el, "x") || 0), cy = r.top + r.height / 2 - (gsap.getProperty(el, "y") || 0);
        const dx = e.clientX - cx, dy = e.clientY - cy, lim = Math.max(r.width, r.height) * (0.5 + reach);
        if (Math.hypot(dx, dy) < lim) {
          active = true; qx(dx * strength); qy(dy * strength);
          if (inner) { ix(dx * strength * 0.5); iy(dy * strength * 0.5); }
        } else if (active) {
          active = false;
          gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)", overwrite: "auto" });
          if (inner) gsap.to(inner, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)", overwrite: "auto" });
        }
      }, { passive: true });
    });
  });
}
