import { hasGsap, prefersReducedMotion, toArray, first, whenReady, afterGate } from "./core.js";
import { SLIDE, splitLines } from "./split-lines.js";

/* HERO INTRO
   A configurable page-load sequence. Every key is a CSS selector and every one is optional:
     header   (style "header") the nav bar itself, slides down first  e.g. ".nav"
     canvas   box that opens from the centre (clip-path) first        e.g. ".hero_canvas"
     brand    logo in the nav drops in                                e.g. ".nav-wrap .brand-link"
     links    nav links stagger in                                    e.g. ".nav-wrap .nav-link"
     navRight nav button pops in                                      e.g. ".nav-wrap .nav-right"
     media    image / video thumbnail slides up                       e.g. ".hero_servers"
     title    heading, line by line (line slide, see split-lines.js)   e.g. ".hero-header h1"
     logo     small partner logo slides in                            e.g. ".hpe-logo"
     sub      sub-heading / copy (its children fade up one by one)    e.g. ".hero-subheader-wrap"
     button   hero CTA pops in                                        e.g. ".hero-btn"
   order: "reading" plays the elements in reading / hierarchy order instead of the default (media early):
          nav (quick, in parallel) > title > sub > button > partner logo > media. Each starts while the previous one is ~70% done.
   readingQuery: media query where the reading order applies, e.g. "(max-width: 767px)" (phones only). Omit it to use the
          reading order at every size. Outside the query the default sequence plays.
   radius: corner radius of the canvas clip (match your CSS), default "24px".

   style: "cascade" plays a different, fully CSS-transition-like intro (everything starts together; each element has its own
          opacity/transform duration, delay and a cubic-bezier ease). Nav logo flies in from the right (scale .01 > 1, like the reference logo tiles), the nav links fade in one by one, the nav button
          flies in from the left (scale .01), the headline keeps the original line slide, the copy scales up from .85, the button
          scales in last, the media thumbnail grows from .05, and a soft blurred cover wipes away left to right (cover: false to skip).
          Values copied from a reference page; see CASCADE below. Phones (<768px) slide in from the right, larger screens scale.
   The Webflow <head> must hide these first (no flash) and mark the page, see
   animations/templates/head.html:  html.hero-intro <selectors> { visibility: hidden }
   The class is removed here once every start state is set. */

/* Cubic-bezier easing (same maths as CSS cubic-bezier), returned as a GSAP ease function. */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = function (t) { return ((ax * t + bx) * t + cx) * t; };
  const Y = function (t) { return ((ay * t + by) * t + cy) * t; };
  const dX = function (t) { return (3 * ax * t + 2 * bx) * t + cx; };
  return function (x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = X(t) - x;
      if (Math.abs(e) < 1e-5) return Y(t);
      const d = dX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1; t = x;
    for (let i = 0; i < 24; i++) { const v = X(t); if (Math.abs(v - x) < 1e-5) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}
const EASE_MAIN  = bezier(0.4, 0, 0.1, 1);       // opacity + transform of nearly everything
const EASE_BOX   = bezier(0.4, 0, 0, 1);         // media thumbnail growing from .05
const EASE_CSS   = bezier(0.25, 0.1, 0.25, 1);   // CSS default "ease" (media opacity)
const EASE_WIPE  = bezier(0.89, 0.14, 0.3, 0.95);// cover wipe

/* CASCADE timings (seconds, all relative to the start). op = [duration, delay] for opacity, tf = [duration, delay] for transform.
   big = >= 768px (scale-ups), small = < 768px (slide in from the right). */
const CASCADE = {
  brand:    { from: { x: 64, scale: 0.01 },    op: [0.2, 0],   tf: [0.8, 0] },   // nav logo: flies in from the right, like the reference's logo tiles
  links:    { from: { },                       op: [0.8, 0.6], stagger: 0.1 },   // one by one (the reference fades its single nav title in)
  navRight: { from: { x: -64, scale: 0.01 },   op: [0.2, 0.1], tf: [0.8, 0.1] },
  media:    { from: { scale: 0.05 },           op: [0.6, 0.2], tf: [1.4, 0.1], opEase: EASE_CSS, tfEase: EASE_BOX },
  big: {
    sub:   { from: { scale: 0.85 }, op: [1, 0.2], tf: [1, 0.2] },
    logo:  { from: { scale: 0.85 }, op: [1, 0.5], tf: [1, 0.5] },
    button:{ from: { scale: 0.6 },  op: [1, 0.8], tf: [1, 0.8] }
  },
  small: {
    sub:   { from: { x: 64 }, op: [1, 0.2],  tf: [1, 0.2] },
    logo:  { from: { x: 64 }, op: [1, 0.45], tf: [1, 0.45] },
    button:{ from: { x: 64 }, op: [1, 0.3],  tf: [1, 0.3] }
  },
  start: 0.2                                    // the reference starts 200 ms after DOM ready
};

export function heroIntro(cfg) {
  cfg = cfg || {};
  const root = document.documentElement;
  const done = function () { root.classList.remove("hero-intro"); };
  if (!hasGsap(false) || prefersReducedMotion()) { done(); return; }
  const gsap = window.gsap;

  const el = {
    canvas:   first(cfg.canvas),
    header:   first(cfg.header),
    brand:    first(cfg.brand),
    links:    toArray(cfg.links),
    navRight: first(cfg.navRight),
    media:    first(cfg.media),
    title:    first(cfg.title),
    logo:     first(cfg.logo),
    sub:      first(cfg.sub),
    button:   first(cfg.button)
  };
  const has = function (x) { return x && (!Array.isArray(x) || x.length); };
  const RADIUS = cfg.radius || "24px";
  const clip = function (v, h) { return "inset(" + v + "% " + h + "% " + v + "% " + h + "% round " + RADIUS + ")"; };
  if (!Object.keys(el).some(function (k) { return has(el[k]); })) { done(); return; }


  function cascade() {
    const big = window.matchMedia("(min-width: 768px)").matches;
    const C = CASCADE;
    const set = big ? C.big : C.small;
    const clearAll = [];
    const tl = gsap.timeline({ paused: true, onComplete: function () {
      clearAll.forEach(function (f) { f(); });
    } });
    const T0 = C.start;

    // helper: hide at start, then fade (autoAlpha) + move on their own clocks
    function item(target, spec) {
      if (!target || (Array.isArray(target) && !target.length)) return;
      gsap.set(target, Object.assign({ autoAlpha: 0 }, spec.from));
      const tf = spec.tf;
      tl.to(target, { autoAlpha: 1, duration: spec.op[0], ease: spec.opEase || EASE_MAIN, stagger: spec.stagger || 0 }, T0 + spec.op[1]);
      if (tf) tl.to(target, { x: 0, y: 0, scale: 1, duration: tf[0], ease: spec.tfEase || EASE_MAIN }, T0 + tf[1]);
      clearAll.push(function () { gsap.set(target, { clearProps: "transform,opacity,visibility" }); });
    }

    // nav: logo flies in from the right, links fade together, button flies in from the left
    item(el.brand, C.brand);
    item(el.links, C.links);
    item(el.navRight, C.navRight);

    // headline: the library's original line slide (kept as it was), starting with the nav button
    if (has(el.title)) {
      const sp = splitLines(el.title);
      gsap.set(el.title, { autoAlpha: 1 });
      gsap.set(sp.lines, Object.assign({}, SLIDE.from));
      tl.to(sp.lines, Object.assign({}, SLIDE.to, { stagger: SLIDE.step }), T0);
      clearAll.push(function () { sp.revert(); });
    }
    // copy as ONE block (not child by child)
    item(el.sub, set.sub);
    item(el.logo, set.logo);
    item(el.button, set.button);
    item(el.media, C.media);

    // soft cover wipes away left to right (page background colour, blurred edge)
    let cover = null;
    const heroEl = (el.title && el.title.closest && el.title.closest("section")) || (el.media && el.media.closest("section"));
    if (cfg.cover !== false && heroEl) {
      const bgOf = function (n) { const c = getComputedStyle(n).backgroundColor; return /rgba\(.*,\s*0\)$|transparent/.test(c) ? "" : c; };
      const bg = bgOf(heroEl) || bgOf(document.body) || "#fff";
      if (getComputedStyle(heroEl).position === "static") { heroEl.style.position = "relative"; clearAll.push(function () { heroEl.style.position = ""; }); }
      const wrap = document.createElement("div");
      wrap.setAttribute("aria-hidden", "true");
      wrap.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:5;";
      cover = document.createElement("div");
      cover.style.cssText = "position:absolute;top:-50%;bottom:-50%;left:0;right:-40vw;background:" + bg + ";filter:blur(8vw);transform-origin:0 100%;will-change:transform;";
      wrap.appendChild(cover);
      heroEl.appendChild(wrap);
      gsap.set(cover, { x: "-20vw" });
      tl.to(cover, { x: "120vw", duration: 0.85, ease: EASE_WIPE }, T0);
      clearAll.push(function () { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); });
    }
    done();                                           // GSAP owns visibility from here
    afterGate(function () { tl.play(); });
  }

  /* HEADER SEQUENCE (style: "header"): the page starts empty; the header bar slides down from the top (0.9s), then its logo, links and
     button animate in, then the hero follows (title line slide, media rises, copy, partner logo, CTA). header: selector of the bar. */
  function headerSeq() {
    const clearAll = [];
    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" }, onComplete: function () { clearAll.forEach(function (f) { f(); }); } });
    const T0 = 0.15;
    const hide = function (t, from) { if (has(t)) { gsap.set(t, Object.assign({ autoAlpha: 0 }, from)); clearAll.push(function () { gsap.set(t, { clearProps: "transform,opacity,visibility" }); }); } };
    if (el.header) { gsap.set(el.header, { yPercent: -100, autoAlpha: 1 }); clearAll.push(function () { gsap.set(el.header, { clearProps: "transform,opacity,visibility" }); }); }
    hide(el.brand, { y: -14 }); hide(el.links, { y: -12 }); hide(el.navRight, { scale: 0.85 });
    hide(el.media, { y: 60 }); hide(el.sub, { y: 24 }); hide(el.logo, { y: 16 }); hide(el.button, { scale: 0.8 });
    if (has(el.title)) { gsap.set(el.title, { autoAlpha: 1 }); }
    let sp = null;
    if (has(el.title)) { sp = splitLines(el.title); gsap.set(sp.lines, Object.assign({}, SLIDE.from)); clearAll.push(function () { sp.revert(); }); }
    if (el.header) tl.to(el.header, { yPercent: 0, duration: 0.9, ease: "power3.inOut" }, T0);
    if (has(el.brand))    tl.to(el.brand,    { autoAlpha: 1, y: 0, duration: 0.6 }, T0 + 0.65);
    if (has(el.links))    tl.to(el.links,    { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.07 }, T0 + 0.75);
    if (has(el.navRight)) tl.to(el.navRight, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(1.6)" }, T0 + 0.95);
    const H = T0 + 1.0;                                           // hero starts as the nav contents land
    if (sp) tl.to(sp.lines, Object.assign({}, SLIDE.to, { stagger: SLIDE.step }), H);
    if (has(el.media))  tl.to(el.media,  { autoAlpha: 1, y: 0, duration: 1.1 }, H + 0.1);
    if (has(el.sub))    tl.to(el.sub,    { autoAlpha: 1, y: 0, duration: 0.8 }, H + 0.4);
    if (has(el.logo))   tl.to(el.logo,   { autoAlpha: 1, y: 0, duration: 0.8 }, H + 0.55);
    if (has(el.button)) tl.to(el.button, { autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(1.6)" }, H + 0.7);
    done();
    afterGate(function () { tl.play(); });
  }

  function build() {
    if (cfg.style === "header") { headerSeq(); return; }
    if (cfg.style === "cascade") { cascade(); return; }
    const splits = [];
    let titleLines = [];
    if (has(el.title)) { const sp = splitLines(el.title); splits.push(sp); titleLines = sp.lines; }
    // copy (sub): the earlier fade-up, one block at a time. Only the heading uses the line slide.
    const subLines = has(el.sub) ? (el.sub.children.length ? Array.prototype.slice.call(el.sub.children) : [el.sub]) : [];

    // start states (everything hidden)
    if (has(el.canvas))   el.canvas.style.clipPath = clip(50, 50);
    if (has(el.brand))    gsap.set(el.brand,    { autoAlpha: 0, y: -24 });
    if (has(el.links))    gsap.set(el.links,    { autoAlpha: 0, y: -16 });
    if (has(el.navRight)) gsap.set(el.navRight, { autoAlpha: 0, scale: 0.85 });
    if (has(el.media))    gsap.set(el.media,    { autoAlpha: 0, yPercent: 12 });
    if (has(el.title))    gsap.set(el.title,    { autoAlpha: 1 });
    if (titleLines.length) gsap.set(titleLines, Object.assign({}, SLIDE.from));
    if (has(el.logo))     gsap.set(el.logo,     { autoAlpha: 0, x: -30 });
    if (has(el.sub))      gsap.set(el.sub,      { autoAlpha: 1 });
    if (subLines.length)  gsap.set(subLines,    { autoAlpha: 0, y: 20 });
    if (has(el.button))   gsap.set(el.button,   { autoAlpha: 0, scale: 0.8 });
    done();                                          // GSAP owns visibility from here

    const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out" }, onComplete: function () {
      if (has(el.canvas)) el.canvas.style.clipPath = "";
      splits.forEach(function (sp) { sp.revert(); });
    } });
    const t = has(el.canvas) ? 1.1 : 0;

    if (has(el.canvas)) {
      const box = { v: 50, h: 50 };
      tl.to(box, { v: 0, h: 0, duration: 1.4, ease: "power4.inOut",
        onUpdate: function () { el.canvas.style.clipPath = clip(box.v, box.h); } }, 0.1);
    }
    const reading = cfg.order === "reading" && (!cfg.readingQuery || window.matchMedia(cfg.readingQuery).matches);
    if (reading) {
      // 1 nav (small, quick, in parallel) 2 title 3 sub 4 button 5 partner logo 6 media. Overlapped so it feels like one flow (~2.3s).
      if (has(el.brand))    tl.to(el.brand,    { autoAlpha: 1, y: 0, duration: 0.6 }, t);
      if (has(el.links))    tl.to(el.links,    { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06 }, t + 0.05);
      if (has(el.navRight)) tl.to(el.navRight, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, t + 0.15);
      if (titleLines.length) tl.to(titleLines, Object.assign({}, SLIDE.to, { stagger: SLIDE.step }), t + 0.2);
      if (subLines.length)  tl.to(subLines,    { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12 }, t + 0.8);
      if (has(el.button))   tl.to(el.button,   { autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(2)" }, t + 1.1);
      if (has(el.logo))     tl.to(el.logo,     { autoAlpha: 1, x: 0, duration: 0.7 }, t + 1.3);
      if (has(el.media))    tl.to(el.media,    { autoAlpha: 1, yPercent: 0, duration: 1.0 }, t + 1.4);
    } else {
      if (has(el.brand))    tl.to(el.brand,    { autoAlpha: 1, y: 0, duration: 0.7 }, t);
      if (has(el.links))    tl.to(el.links,    { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 }, t + 0.1);
      if (has(el.navRight)) tl.to(el.navRight, { autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(2)" }, t + 0.35);
      if (has(el.media))    tl.to(el.media,    { autoAlpha: 1, yPercent: 0, duration: 1.1 }, t + 0.1);
      if (titleLines.length) tl.to(titleLines, Object.assign({}, SLIDE.to, { stagger: SLIDE.step }), t + 0.3);
      if (has(el.logo))     tl.to(el.logo,     { autoAlpha: 1, x: 0, duration: 0.8 }, t + 0.9);
      if (subLines.length)  tl.to(subLines,    { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12 }, t + 0.9);
      if (has(el.button))   tl.to(el.button,   { autoAlpha: 1, scale: 1, duration: 0.8, ease: "back.out(2)" }, t + 1.3);
    }
    afterGate(function () { tl.play(); });             // waits for the opening curtain, if there is one
  }

  whenReady(build);
}
