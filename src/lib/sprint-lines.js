import { hasGsap, prefersReducedMotion, toArray } from "./core.js";

/* SPRINT LINES
   Racing-stripe artwork (one image or SVG) that "sprints" in when its section scrolls into view.
   A soft, slanted leading edge (CSS mask, so no hard cut and no extra markup) races across the
   element from the left, the artwork kicks forward a few percent with a fast-out ease, then settles.
   Plays once. Reduced motion: shown as-is.
   Config (all optional):
     items     selector(s) of the artwork           ".stripes"
     angle     mask direction in deg (90 = flat L>R, lower = steeper slant)   default 68
     feather   softness of the leading edge, % of width                      default 22
     duration  seconds                                                        default 1.5
     start     ScrollTrigger start                                            default "top 80%"
     kick      px the artwork travels while it sprints in                     default 90 */
export function sprintLines(cfg) {
  cfg = cfg || {};
  if (!hasGsap(true) || prefersReducedMotion()) return;
  const gsap = window.gsap;
  const angle = cfg.angle != null ? cfg.angle : 68;
  const feather = cfg.feather != null ? cfg.feather : 22;
  const kick = cfg.kick != null ? cfg.kick : 90;
  const mask = function (p) {
    const edge = p, tail = p - feather;
    return "linear-gradient(" + angle + "deg, #000 " + tail + "%, transparent " + edge + "%)";
  };
  toArray(cfg.items).forEach(function (el) {
    const state = { p: 0 };
    const apply = function () {
      const m = mask(state.p);
      el.style.webkitMaskImage = m; el.style.maskImage = m;
    };
    el.style.webkitMaskRepeat = el.style.maskRepeat = "no-repeat";
    apply();
    gsap.set(el, { x: -kick });
    const tl = gsap.timeline({ paused: true, scrollTrigger: { trigger: el, start: cfg.start || "top 80%", once: true } });
    tl.to(state, { p: 100 + feather, duration: cfg.duration || 1.5, ease: "power3.inOut", onUpdate: apply }, 0)
      .to(el, { x: 0, duration: (cfg.duration || 1.5) * 1.1, ease: "expo.out" }, 0)
      .add(function () { el.style.webkitMaskImage = el.style.maskImage = "none"; });
  });
}
