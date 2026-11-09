import { hasGsap, prefersReducedMotion, whenReady } from "./core.js";

/* ROAD LOADER (opening animation: roads that bend toward the viewer)
   Five colour stripes run straight down from the top of the screen, bend near the middle and fan out
   toward the bottom (like the stripes in the hero artwork). They draw themselves one after another,
   then the whole cover lifts away. Everything else starts after it (see setGate in core.js).

   roadLoader({
     colors: ["var(--brand--teal-700)", ...],   // one per stripe, left to right at the top (Webflow variables or any CSS colour)
     background: "var(--neutral--gray-100)",     // cover colour behind the stripes
     draw: 1.2, stagger: 0.12, hold: 0.25, exit: 0.7 })   // seconds

   The <head> paints the cover colour from the first frame (html.curtain-on), so nothing flashes.
   Reduced motion / no GSAP: no loader. Returns a Promise that resolves when the cover is gone. */
export function roadLoader(opts) {
  opts = opts || {};
  const root = document.documentElement;
  const open = function () { root.classList.remove("curtain-on"); root.style.overflow = ""; };
  if (!hasGsap(false) || prefersReducedMotion()) { open(); return Promise.resolve(); }
  const gsap = window.gsap;
  const colors = opts.colors && opts.colors.length ? opts.colors : ["#000"];
  const n = colors.length;
  const NS = "http://www.w3.org/2000/svg";
  const W = 1600, H = 900, MID = W / 2, GAP = 64, BEND = 380, STEPS = 70;

  // Centre line of one stripe: straight down to BEND, then a curve out to (ex, H + 80).
  // Returns points with a width each (thin at the top, wider toward the viewer).
  function stripe(k) {
    const x = MID + k * GAP, ex = MID + k * (W * 0.23);
    const c1x = x, c1y = BEND + 150, c2x = x + (ex - x) * 0.55, c2y = BEND + 260, ey = H + 80;
    const w0 = 30 + Math.abs(k) * 6, w1 = 90 + Math.abs(k) * 70;
    const pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS, u = 1 - t;
      let px, py, dx, dy;
      if (t < 0.28) {                                   // straight part, 0 .. 28% of the length
        const f = t / 0.28; px = x; py = -40 + (BEND + 40) * f; dx = 0; dy = 1;
      } else {                                          // bezier part
        const b = (t - 0.28) / 0.72, v = 1 - b;
        px = v * v * v * x + 3 * v * v * b * c1x + 3 * v * b * b * c2x + b * b * b * ex;
        py = v * v * v * BEND + 3 * v * v * b * c1y + 3 * v * b * b * c2y + b * b * b * ey;
        dx = 3 * v * v * (c1x - x) + 6 * v * b * (c2x - c1x) + 3 * b * b * (ex - c2x);
        dy = 3 * v * v * (c1y - BEND) + 6 * v * b * (c2y - c1y) + 3 * b * b * (ey - c2y);
      }
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const w = (w0 + (w1 - w0) * Math.pow(t, 1.6)) / 2;
      pts.push([px, py, -dy / len * w, dx / len * w]);   // centre + half-width normal
    }
    return pts;
  }
  // Polygon outline of the first part of a stripe (0..1 of its length).
  function outline(pts, prog) {
    const m = Math.max(1, Math.round(prog * STEPS)), l = [], r = [];
    for (let i = 0; i <= m; i++) { const q = pts[i]; l.push((q[0] + q[2]).toFixed(1) + " " + (q[1] + q[3]).toFixed(1)); r.push((q[0] - q[2]).toFixed(1) + " " + (q[1] - q[3]).toFixed(1)); }
    return "M" + l.join(" L") + " L" + r.reverse().join(" L") + "Z";
  }

  return new Promise(function (resolve) {
    whenReady(function () {
      const wrap = document.createElement("div");
      wrap.setAttribute("aria-hidden", "true");
      wrap.style.cssText = "position:fixed;inset:0;z-index:99999;pointer-events:none;overflow:hidden;background:" + (opts.background || "#F2F2F2") + ";";
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
      svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
      const items = colors.map(function (c, i) {
        const el = document.createElementNS(NS, "path");
        el.style.fill = c; el.setAttribute("d", "M0 0");
        svg.appendChild(el);
        return { el: el, pts: stripe(i - (n - 1) / 2), p: 0 };
      });
      wrap.appendChild(svg);
      document.body.appendChild(wrap);
      root.classList.remove("curtain-on");
      root.style.overflow = "hidden";
      if (window.lenis) window.lenis.stop();

      const tl = gsap.timeline({
        onComplete: function () {
          wrap.remove(); root.style.overflow = "";
          if (window.lenis) window.lenis.start();
          resolve();
        }
      });
      tl.to(items, { p: 1, duration: opts.draw != null ? opts.draw : 1.1, ease: "power2.inOut",
        stagger: { each: opts.stagger != null ? opts.stagger : 0.1, from: "center" },
        onUpdate: function () { items.forEach(function (it) { if (it.p > 0) it.el.setAttribute("d", outline(it.pts, it.p)); }); } }, 0.1);
      tl.to(wrap, { yPercent: -100, duration: opts.exit != null ? opts.exit : 0.6, ease: "power3.inOut" },
        ">" + (opts.hold != null ? opts.hold : 0.15));
    });
  });
}
