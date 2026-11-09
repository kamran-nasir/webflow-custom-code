import { hasGsap, toArray } from "./core.js";

/* SCROLL PARALLAX
   Put data-parallax="<percent>" on any element inside a section (or inside an element with
   data-parallax-section). As the section scrolls away the element drifts by that percent of
   the section height:  negative = moves up faster (feels close), positive = lags (feels far).
   It uses the CSS `translate` property so it never fights intro animations (x/y/scale)
   or the mouse parallax. Less movement on phones; off for reduced motion. */
export function scrollParallax(opts) {
  opts = opts || {};
  if (!hasGsap(true)) return;
  const gsap = window.gsap;
  // Optional: set targets from the campaign entry instead of the Designer: items: [[".selector", -4], ...]
  (opts.items || []).forEach(function (it) {
    toArray(it[0]).forEach(function (el) { el.setAttribute("data-parallax", it[1]); });
  });
  const sections = toArray(opts.section || "section, [data-parallax-section]").filter(function (s) {
    return s.querySelector("[data-parallax]");
  });
  if (!sections.length) return;

  const mm = gsap.matchMedia();
  mm.add({
    desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
    mobile:  "(max-width: 767px) and (prefers-reduced-motion: no-preference)"
  }, function (ctx) {
    const k = ctx.conditions.desktop ? 1 : (opts.mobileFactor != null ? opts.mobileFactor : 0.4);
    const touched = [];
    sections.forEach(function (section) {
      const items = toArray(section.querySelectorAll("[data-parallax]"));
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: section.hasAttribute("data-parallax-start") ? section.getAttribute("data-parallax-start") : "top bottom",
          end: "bottom top",
          scrub: opts.scrub != null ? opts.scrub : 1,
          invalidateOnRefresh: true
        }
      });
      items.forEach(function (el) {
        const pct = (parseFloat(el.getAttribute("data-parallax")) || 0) * k;
        touched.push(el);
        tl.fromTo(el, { translate: "0px 0px" }, { translate: function () { return "0px " + (section.offsetHeight * pct / 100) + "px"; } }, 0);
      });
    });
    return function () { gsap.set(touched, { clearProps: "translate" }); };
  });
}

/* MOUSE PARALLAX
   Container: data-mouse-parallax. Layers inside it: data-depth="<px>"
   (positive = moves away from the cursor, negative = with it). Desktop pointers only. */
export function mouseParallax(opts) {
  opts = opts || {};
  if (!hasGsap(false)) return;
  const gsap = window.gsap;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  // Optional: container + layers from the campaign entry: { container: ".hero", layers: [[".img", 20], ...] }
  if (opts.container) {
    toArray(opts.container).forEach(function (c) {
      c.setAttribute("data-mouse-parallax", "");
      (opts.layers || []).forEach(function (l) {
        toArray(c.querySelectorAll(l[0])).forEach(function (el) { el.setAttribute("data-depth", l[1]); });
      });
    });
  }
  toArray("[data-mouse-parallax]").forEach(function (box) {
    const movers = toArray(box.querySelectorAll("[data-depth]")).map(function (el) {
      return {
        d: parseFloat(el.getAttribute("data-depth")) || 0,
        x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3.out" }),
        y: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3.out" })
      };
    });
    if (!movers.length) return;
    const move = function (nx, ny) { movers.forEach(function (m) { m.x(-nx * m.d); m.y(-ny * m.d * 0.6); }); };
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      const r = box.getBoundingClientRect();
      if (e.clientY > r.bottom || e.clientY < r.top - 120) { move(0, 0); return; }
      move(gsap.utils.clamp(-1, 1, ((e.clientX - r.left) / r.width - 0.5) * 2),
           gsap.utils.clamp(-1, 1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () { move(0, 0); });
  });
}
