import { hasGsap, prefersReducedMotion, toArray } from "./core.js";

/* SPRINT LINES
   Racing stripes that sprint in ONE BY ONE when their section scrolls into view.

   Pass the stripe geometry (taken from the artwork) and the module swaps the flat image for an inline
   SVG with one shape per line, each with its own soft-edged mask, then races them in with a stagger.
   Plays once. Reduced motion (or no GSAP): the original image stays as it is.

   sprintLines({
     items: ".stripes",                         // the <img> to replace
     svg: { width: 3200, height: 668,           // artwork viewBox
            stripes: [ { color: "var(--brand--teal-700)", points: [[x,y],[x,y],[x,y],[x,y]] }, ... ] },
     feather: 360,                               // softness of the leading edge (viewBox units)
     slant: 20,                                  // leading-edge angle in degrees
     duration: 1.3, stagger: 0.16,               // per line / between lines (seconds)
     kick: 220,                                  // how far each line travels while sprinting in
     start: "top 80%" })                         // ScrollTrigger start

   Lines are listed first (back) to last (front); the stagger follows that order. */
const NS = "http://www.w3.org/2000/svg";
function node(name, attrs, parent) {
  const n = document.createElementNS(NS, name);
  Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
  if (parent) parent.appendChild(n);
  return n;
}

export function sprintLines(cfg) {
  cfg = cfg || {};
  const art = cfg.svg;
  if (!art || !art.stripes || !art.stripes.length || !hasGsap(true) || prefersReducedMotion()) return;
  const gsap = window.gsap;
  const W = art.width, H = art.height;
  const F = cfg.feather != null ? cfg.feather : 360;
  const shift = Math.ceil(H * Math.tan((cfg.slant != null ? cfg.slant : 20) * Math.PI / 180));
  const R = W + F;                                    // sweep rect: solid for W, then a soft F-wide edge
  const kick = cfg.kick != null ? cfg.kick : 220;
  const dur = cfg.duration != null ? cfg.duration : 1.3;
  const gap = cfg.stagger != null ? cfg.stagger : 0.16;

  toArray(cfg.items).forEach(function (img, n) {
    if (img.tagName !== "IMG") return;
    const svg = node("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", "aria-hidden": "true", focusable: "false" });
    svg.setAttribute("class", img.className);          // keep the Designer styling / positioning
    svg.style.cssText = "display:block;height:auto;";
    const defs = node("defs", {}, svg);
    const grad = node("linearGradient", { id: "sprint-fade-" + n, x1: "0", x2: "1", y1: "0", y2: "0" }, defs);
    node("stop", { offset: W / R, "stop-color": "#fff" }, grad);
    node("stop", { offset: 1, "stop-color": "#000" }, grad);

    const lines = art.stripes.map(function (s, i) {
      const mask = node("mask", { id: "sprint-mask-" + n + "-" + i, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs);
      const skew = node("g", { transform: "skewX(" + -(cfg.slant != null ? cfg.slant : 20) + ")" }, mask);
      const sweep = node("rect", { x: -R, y: 0, width: R, height: H + 2, fill: "url(#sprint-fade-" + n + ")" }, skew);
      const wrap = node("g", { mask: "url(#sprint-mask-" + n + "-" + i + ")" }, svg);
      const poly = node("polygon", { points: s.points.map(function (p) { return p.join(","); }).join(" ") }, wrap);
      poly.style.fill = s.color;                         // hex or var(--webflow-variable, #fallback)
      return { sweep: sweep, poly: poly };
    });

    img.parentNode.insertBefore(svg, img);
    img.className = "";                                  // the SVG now carries the layout class
    img.style.display = "none";

    gsap.set(lines.map(function (l) { return l.poly; }), { x: -kick });
    const tl = gsap.timeline({ paused: true, scrollTrigger: { trigger: svg, start: cfg.start || "top 80%", once: true } });
    lines.forEach(function (l, i) {
      tl.to(l.sweep, { attr: { x: shift }, duration: dur, ease: "power3.inOut" }, i * gap)
        .to(l.poly, { x: 0, duration: dur * 1.25, ease: "expo.out" }, i * gap);
    });
    tl.add(function () { lines.forEach(function (l) { l.poly.parentNode.removeAttribute("mask"); }); });
  });
}
