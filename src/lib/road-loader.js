import { hasGsap, prefersReducedMotion, whenReady } from "./core.js";

/* ROAD LOADER (opening animation: logos + roads from a vanishing point)
   The logos fade in, seven colour stripes grow out from just below them, widening and bending toward the
   viewer (like a road in perspective), then the logos fade out and the stripes run back to where they came
   from. The cover then fades away and everything else starts (see setGate in core.js).

   roadLoader({
     colors: ["var(--brand--teal-700)", ...],   // 7 stripes, left to right (Webflow variables or any CSS colour)
     background: "var(--neutral--gray-100)",     // cover colour
     logos: { left: ".cpp-hpe", right: ".cpp-logo-link img" },   // selectors of <img> elements whose src is reused
     draw: 1.2, stagger: 0.07, back: 0.8 })      // seconds

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
  const W = 1600, H = 900, MID = W / 2, VY = 470, STEPS = 70;
  // the seven stripes start as wide as the logo lock-up (about 300), with a gap between them
  const PITCH = 44, TOP_W = 30, LOGO_W = 135, LOGO_GAP = 20;
  // per stripe distance from the middle: where it ends, how wide it gets, how tightly it bends
  const SHAPE = [
    { ex: 0,    ey: H + 80, w: 330, b1: 1,    b2x: 0,   b2y: 1 },
    { ex: 330,  ey: H + 80, w: 150, b1: 0.55, b2x: 0.5, b2y: 0.92 },
    { ex: 700,  ey: 960,    w: 105, b1: 0.72, b2x: 0.45, b2y: 0.98 },
    { ex: 1100, ey: 810,    w: 80,  b1: 0.85, b2x: 0.4, b2y: 1 }
  ];

  // Centre line of one stripe (k = -3..3): short straight run down from the vanishing point, then a curve.
  function stripe(k) {
    const sh = SHAPE[Math.min(Math.abs(k), SHAPE.length - 1)], dir = k < 0 ? -1 : 1;
    const x0 = MID + k * PITCH, y1 = VY + 110, ex = MID + dir * sh.ex, ey = sh.ey;
    const dx = ex - x0, dy = ey - y1;
    const c1x = x0, c1y = y1 + dy * sh.b1, c2x = x0 + dx * sh.b2x, c2y = y1 + dy * sh.b2y;
    const w0 = TOP_W, pts = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      let px, py, tx, ty;
      if (t < 0.18) { px = x0; py = VY + (y1 - VY) * (t / 0.18); tx = 0; ty = 1; }
      else {
        const b = (t - 0.18) / 0.82, v = 1 - b;
        px = v * v * v * x0 + 3 * v * v * b * c1x + 3 * v * b * b * c2x + b * b * b * ex;
        py = v * v * v * y1 + 3 * v * v * b * c1y + 3 * v * b * b * c2y + b * b * b * ey;
        tx = 3 * v * v * (c1x - x0) + 6 * v * b * (c2x - c1x) + 3 * b * b * (ex - c2x);
        ty = 3 * v * v * (c1y - y1) + 6 * v * b * (c2y - c1y) + 3 * b * b * (ey - c2y);
      }
      const len = Math.sqrt(tx * tx + ty * ty) || 1;
      const w = (w0 + (sh.w - w0) * Math.pow(t, 2.4)) / 2;
      pts.push([px, py, -ty / len * w, tx / len * w]);
    }
    return pts;
  }
  function outline(pts, prog) {
    if (prog <= 0.001) return "M0 0";
    const m = Math.max(1, Math.round(prog * STEPS)), l = [], r = [];
    for (let i = 0; i <= m; i++) { const q = pts[i]; l.push((q[0] + q[2]).toFixed(1) + " " + (q[1] + q[3]).toFixed(1)); r.push((q[0] - q[2]).toFixed(1) + " " + (q[1] - q[3]).toFixed(1)); }
    return "M" + l.join(" L") + " L" + r.reverse().join(" L") + "Z";
  }
  // A logo <img> reused inside the SVG, sized by its real aspect ratio, bottom edge on the vanishing point.
  function logo(sel, side) {
    const src = sel && document.querySelector(sel);
    const url = src && (src.currentSrc || src.src);
    if (!url) return null;
    const ratio = src.naturalWidth && src.naturalHeight ? src.naturalHeight / src.naturalWidth : 0.35;
    const h = LOGO_W * ratio;
    const im = document.createElementNS(NS, "image");
    im.setAttribute("href", url);
    im.setAttribute("x", side < 0 ? MID - LOGO_GAP - LOGO_W : MID + LOGO_GAP);
    im.setAttribute("y", VY - h); im.setAttribute("width", LOGO_W); im.setAttribute("height", h);
    im.setAttribute("preserveAspectRatio", "xMidYMax meet");
    im._h = h;
    return im;
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
      // logo lock-up just above the vanishing point: left logo | divider | right logo
      const lg = opts.logos || {}, logoEls = [];
      const l1 = logo(lg.left, -1), l2 = logo(lg.right, 1);
      if (l1 || l2) {
        const dh = Math.max(l1 ? l1._h : 0, l2 ? l2._h : 0);
        const d = document.createElementNS(NS, "rect");
        d.setAttribute("x", MID - 1.5); d.setAttribute("y", VY - dh); d.setAttribute("width", 3); d.setAttribute("height", dh);
        d.style.fill = colors[Math.floor(n / 2)];
        [l1, d, l2].forEach(function (e) { if (e) { svg.appendChild(e); logoEls.push(e); } });
      }
      wrap.appendChild(svg);
      document.body.appendChild(wrap);
      root.classList.remove("curtain-on");
      root.style.overflow = "hidden";
      if (window.lenis) window.lenis.stop();
      if (logoEls.length) gsap.set(logoEls, { opacity: 0 });

      const draw = opts.draw != null ? opts.draw : 1.2, back = opts.back != null ? opts.back : 0.8;
      const stag = opts.stagger != null ? opts.stagger : 0.07;
      const paint = function () { items.forEach(function (it) { it.el.setAttribute("d", outline(it.pts, it.p)); }); };
      const tl = gsap.timeline({
        onComplete: function () {
          wrap.remove(); root.style.overflow = "";
          if (window.lenis) window.lenis.start();
          resolve();
        }
      });
      if (logoEls.length) tl.to(logoEls, { opacity: 1, duration: 0.45, ease: "power1.out" }, 0.05);
      tl.to(items, { p: 1, duration: draw, ease: "power2.out", stagger: { each: stag, from: "center" }, onUpdate: paint }, 0.35);
      if (logoEls.length) tl.to(logoEls, { opacity: 0, duration: 0.3, ease: "power1.in" }, ">0.1");
      tl.to(items, { p: 0, duration: back, ease: "power2.inOut", stagger: { each: stag * 0.6, from: "edges" }, onUpdate: paint }, "<0.1");
      tl.to(wrap, { opacity: 0, duration: 0.35, ease: "power1.out" }, ">-0.05");
    });
  });
}
