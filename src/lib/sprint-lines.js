import { hasGsap, prefersReducedMotion, toArray } from "./core.js";

/* SPRINT LINES
   Racing stripes that sprint in ONE BY ONE when their section scrolls into view.

   Pass the stripe geometry (taken from the artwork) and the module swaps the flat image for an inline
   SVG with one shape per line, slid in sideways one after another (never masked, so no end or corner shows).
   Plays once. Reduced motion (or no GSAP): the original image stays as it is.

   sprintLines({
     items: ".stripes",                         // the <img> to replace
     svg: { width: 3200, height: 668,           // artwork viewBox
            stripes: [ { color: "var(--brand--secondary)", points: [[x,y],[x,y],[x,y],[x,y]] }, ... ] },
     duration: 1.3, stagger: 0.16,               // per line / between lines (seconds)
     kick: 700,                                  // how far right each line starts (viewBox units)
     bleed: { top: 400, bottom: 500 },           // extend every stripe past its ends (viewBox units) so it runs
                                                 // off the section edges and no tip/corner shows
     direction: "shoot",                         // optional: each stripe SHOOTS along its own length from its bottom end to its top end
                                                 // (square-cut head, perpendicular to the stripe), the lowest stripe first, then each one above it
                                                 // ("up" instead lifts the stripes in from below)
     rise: 520,                                  // ("up" only) how far below each stripe starts (viewBox units)
     start: "top 80%" })                         // ScrollTrigger start

   Lines are listed first (back) to last (front); the stagger follows that order. */
const NS = "http://www.w3.org/2000/svg";
function node(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
  if (parent) parent.appendChild(n);
  return n;
}

/* Extend a 4-point stripe [TL, TR, BR, BL] along its own edges past y=0 (by top) and y=H (by bottom). */
function bleedPoints(pts, top, bottom, H) {
  const TL = pts[0], TR = pts[1], BR = pts[2], BL = pts[3];
  const along = function (a, b, y) { return [a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y]; };
  return [along(TL, BL, -top), along(TR, BR, -top), along(TR, BR, H + bottom), along(TL, BL, H + bottom)];
}

export function sprintLines(cfg) {
  cfg = cfg || {};
  const art = cfg.svg;
  if (!art || !art.stripes || !art.stripes.length || !hasGsap(true) || prefersReducedMotion()) return;
  const gsap = window.gsap;
  const W = art.width, H = art.height;
  const bleed = cfg.bleed || { top: 0, bottom: 0 };
  const bt = bleed.top || 0, bb = bleed.bottom || 0;
  const kick = cfg.kick != null ? cfg.kick : 700;
  const dur = cfg.duration != null ? cfg.duration : 1.3;
  const gap = cfg.stagger != null ? cfg.stagger : 0.16;

  toArray(cfg.items).forEach(function (img, n) {
    if (img.tagName !== "IMG") return;
    const svg = node("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" });
    svg.setAttribute("class", img.className);          // keep the Designer styling / positioning
    svg.style.cssText = "display:block;height:auto;overflow:visible;";
    const lines = art.stripes.map(function (s) {
      const poly = node("polygon", { points: (bt || bb ? bleedPoints(s.points, bt, bb, H) : s.points).map(function (p) { return p.join(","); }).join(" ") }, svg);
      poly.style.fill = s.color;                         // hex or var(--webflow-variable, #fallback)
      return { poly: poly };
    });

    img.parentNode.insertBefore(svg, img);
    img.className = "";                                  // the SVG now carries the layout class
    img.style.display = "none";

    // "slide"/"up": no masks, every stripe keeps its full (bled) length and just moves into place.
    // "shoot": each stripe is redrawn as a growing polygon: its tail stays at the bottom end, its head (cut square to the stripe's own
    // direction) travels to the top end; at the end the exact original polygon is put back.
    const mode = cfg.direction === "shoot" ? "shoot" : cfg.direction === "up" ? "up" : "slide";
    const rise = cfg.rise != null ? cfg.rise : 520;
    const fmt = function (pts) { return pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" "); };
    lines.forEach(function (l, i) {
      l.full = (bt || bb ? bleedPoints(art.stripes[i].points, bt, bb, H) : art.stripes[i].points);
      if (mode !== "shoot") return;
      const TL = l.full[0], TR = l.full[1], BR = l.full[2], BL = l.full[3];
      const bc = [(BL[0] + BR[0]) / 2, (BL[1] + BR[1]) / 2], tc = [(TL[0] + TR[0]) / 2, (TL[1] + TR[1]) / 2];
      const dx = tc[0] - bc[0], dy = tc[1] - bc[1], len = Math.sqrt(dx * dx + dy * dy);
      let nx = -dy / len, ny = dx / len;
      if ((TR[0] - TL[0]) * nx + (TR[1] - TL[1]) * ny < 0) { nx = -nx; ny = -ny; }          // n points from the stripe's left edge to its right edge
      const half = Math.abs((TR[0] - TL[0]) * nx + (TR[1] - TL[1]) * ny) / 2;
      l.at = function (t) {
        const cx = bc[0] + dx * t, cy = bc[1] + dy * t;
        return [BL, BR, [cx + nx * half, cy + ny * half], [cx - nx * half, cy - ny * half]];
      };
      l.t = { v: 0 };
      l.poly.setAttribute("points", fmt(l.at(0)));
    });
    if (mode === "up") gsap.set(lines.map(function (l) { return l.poly; }), { y: rise, autoAlpha: 0 });
    else if (mode === "slide") gsap.set(lines.map(function (l) { return l.poly; }), { x: kick, autoAlpha: 0 });
    const tl = gsap.timeline({ paused: true, scrollTrigger: { trigger: svg, start: cfg.start || "top 80%", once: true } });
    svg.__sprint = tl;
    (mode === "slide" ? lines : lines.slice().reverse()).forEach(function (l, i) {   // "up"/"shoot": the last (lowest) stripe goes first
      if (mode === "shoot") {
        tl.to(l.t, {
          v: 1.02, duration: dur, ease: "power2.out",
          onUpdate: function () { l.poly.setAttribute("points", fmt(l.at(l.t.v))); },
          onComplete: function () { l.poly.setAttribute("points", fmt(l.full)); }
        }, i * gap);
      } else {
        tl.to(l.poly, mode === "up" ? { y: 0, duration: dur * 1.25, ease: "expo.out" } : { x: 0, duration: dur * 1.25, ease: "expo.out" }, i * gap)
          .to(l.poly, { autoAlpha: 1, duration: dur * 0.3, ease: "none" }, i * gap);
      }
    });
  });
}
