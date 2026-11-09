// Shared helpers for every campaign bundle.
// GSAP, ScrollTrigger, SplitText, MotionPathPlugin and Lenis are loaded from the CDN
// <script> tags in the Webflow footer, so this library reads them from `window`.

export const LIB_VERSION = "2.0.0";

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasGsap(needScrollTrigger) {
  if (typeof window.gsap === "undefined") return false;
  if (needScrollTrigger && typeof window.ScrollTrigger === "undefined") return false;
  return true;
}

// Register whichever plugins are on the page. A missing plugin never stops the rest.
export function registerPlugins() {
  if (!window.gsap) return;
  [window.ScrollTrigger, window.MotionPathPlugin, window.SplitText].forEach(function (p) {
    if (p) window.gsap.registerPlugin(p);
  });
}

// Run once the DOM and the web fonts are ready (so headings split at the right widths).
export function whenReady(fn) {
  const go = function () {
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fn);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
  else go();
}

export function toArray(x) {
  if (!x) return [];
  if (typeof x === "string") return Array.prototype.slice.call(document.querySelectorAll(x));
  if (x.nodeType === 1) return [x];
  return Array.prototype.slice.call(x);
}

export function first(x) {
  return toArray(x)[0] || null;
}

// Console line to confirm which file/version a page is really running.
export function marker(name) {
  console.info("[" + name + "] animations loaded (lib " + LIB_VERSION + ")", {
    gsap: typeof window.gsap,
    ScrollTrigger: typeof window.ScrollTrigger,
    SplitText: typeof window.SplitText,
    Lenis: typeof window.Lenis
  });
}

// The Webflow <head> adds "anim-hide" so animated elements start hidden (no flash).
// Once every module has set its own start state the CSS guard can go.
export function releaseHide() {
  document.documentElement.classList.remove("anim-hide");
}

/* OPENING GATE
   A curtain (curtain.js) can cover the page while it loads. Everything that should start AFTER it has
   cleared (hero intro, scroll reveals) waits on this gate. Without a curtain the gate is already open. */
let gate = Promise.resolve();
export function setGate(promise) { gate = promise; }
export function afterGate(fn) { gate.then(fn); }
