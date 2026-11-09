import { hasGsap, prefersReducedMotion, toArray, first, whenReady } from "./core.js";
import { SLIDE, splitLines } from "./split-lines.js";

/* HERO INTRO
   A configurable page-load sequence. Every key is a CSS selector and every one is optional:
     canvas   box that opens from the centre (clip-path) first        e.g. ".hero_canvas"
     brand    logo in the nav drops in                                e.g. ".nav-wrap .brand-link"
     links    nav links stagger in                                    e.g. ".nav-wrap .nav-link"
     navRight nav button pops in                                      e.g. ".nav-wrap .nav-right"
     media    image / video thumbnail slides up                       e.g. ".hero_servers"
     title    heading, line by line (line slide, see split-lines.js)   e.g. ".hero-header h1"
     logo     small partner logo slides in                            e.g. ".hpe-logo"
     sub      sub-heading / copy, line by line (line slide)           e.g. ".hero-subheader-wrap"
     button   hero CTA pops in                                        e.g. ".hero-btn"
   radius: corner radius of the canvas clip (match your CSS), default "24px".

   The Webflow <head> must hide these first (no flash) and mark the page, see
   animations/templates/head.html:  html.hero-intro <selectors> { visibility: hidden }
   The class is removed here once every start state is set. */
export function heroIntro(cfg) {
  cfg = cfg || {};
  const root = document.documentElement;
  const done = function () { root.classList.remove("hero-intro"); };
  if (!hasGsap(false) || prefersReducedMotion()) { done(); return; }
  const gsap = window.gsap;

  const el = {
    canvas:   first(cfg.canvas),
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

  function build() {
    const splits = [];
    let titleLines = [];
    if (has(el.title)) { const sp = splitLines(el.title); splits.push(sp); titleLines = sp.lines; }
    let subLines = [];
    if (has(el.sub)) {
      const blocks = el.sub.children.length ? Array.prototype.slice.call(el.sub.children) : [el.sub];
      blocks.forEach(function (b) { const sp = splitLines(b); splits.push(sp); subLines = subLines.concat(sp.lines); });
    }

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
    if (subLines.length)  gsap.set(subLines,    Object.assign({}, SLIDE.from));
    if (has(el.button))   gsap.set(el.button,   { autoAlpha: 0, scale: 0.8 });
    done();                                          // GSAP owns visibility from here

    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: function () {
      if (has(el.canvas)) el.canvas.style.clipPath = "";
      splits.forEach(function (sp) { sp.revert(); });
    } });
    const t = has(el.canvas) ? 1.1 : 0;

    if (has(el.canvas)) {
      const box = { v: 50, h: 50 };
      tl.to(box, { v: 0, h: 0, duration: 1.4, ease: "power4.inOut",
        onUpdate: function () { el.canvas.style.clipPath = clip(box.v, box.h); } }, 0.1);
    }
    if (has(el.brand))    tl.to(el.brand,    { autoAlpha: 1, y: 0, duration: 0.7 }, t);
    if (has(el.links))    tl.to(el.links,    { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 }, t + 0.1);
    if (has(el.navRight)) tl.to(el.navRight, { autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(2)" }, t + 0.35);
    if (has(el.media))    tl.to(el.media,    { autoAlpha: 1, yPercent: 0, duration: 1.1 }, t + 0.1);
    if (titleLines.length) tl.to(titleLines, Object.assign({}, SLIDE.to, { stagger: SLIDE.step }), t + 0.3);
    if (has(el.logo))     tl.to(el.logo,     { autoAlpha: 1, x: 0, duration: 0.8 }, t + 0.9);
    if (subLines.length)  tl.to(subLines,    Object.assign({}, SLIDE.to, { stagger: SLIDE.step }), t + 0.9);
    if (has(el.button))   tl.to(el.button,   { autoAlpha: 1, scale: 1, duration: 0.8, ease: "back.out(2)" }, t + 1.3);
  }

  whenReady(build);
}
