import { hasGsap, prefersReducedMotion, whenReady } from "./core.js";

/* CURTAIN (opening animation: vertical columns)
   Full-height colour columns cover the page while it loads, then lift up and out one after another,
   left to right, leaving a staircase edge as the page appears. Modelled on williamsgptech.com.
   Everything else (hero intro, reveals) starts only after the last column has cleared (see setGate).

   curtain({
     colors: ["var(--brand--teal-700)", ...],   // one per column (a Webflow variable or any CSS colour)
     duration: 0.6, stagger: 0.08, hold: 0.2,    // seconds: each column's lift, gap between columns, pause before lifting
     ease: "power3.inOut" })

   The <head> paints the same columns as a CSS gradient on <html> before any JS runs (html.curtain-on),
   so there is no flash; keep that gradient's colours in sync with `colors` (see head.html).
   Reduced motion / no GSAP: no curtain, the page just shows. Returns a Promise that resolves when done. */
export function curtain(opts) {
  opts = opts || {};
  const root = document.documentElement;
  const open = function () { root.classList.remove("curtain-on"); root.style.overflow = ""; };
  if (!hasGsap(false) || prefersReducedMotion()) { open(); return Promise.resolve(); }
  const gsap = window.gsap;
  const colors = opts.colors && opts.colors.length ? opts.colors : ["#000"];
  const n = opts.columns || colors.length;

  return new Promise(function (resolve) {
    whenReady(function () {
      const wrap = document.createElement("div");
      wrap.setAttribute("aria-hidden", "true");
      wrap.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;pointer-events:none;overflow:hidden;";
      const cols = [];
      for (let i = 0; i < n; i++) {
        const c = document.createElement("div");
        c.style.cssText = "flex:1 1 0;height:100%;will-change:transform;background:" + colors[i % colors.length] + ";";
        cols.push(c); wrap.appendChild(c);
      }
      document.body.appendChild(wrap);
      root.classList.remove("curtain-on");               // the page can paint behind the columns now
      root.style.overflow = "hidden";                     // no scrolling while covered
      if (window.lenis) window.lenis.stop();

      gsap.to(cols, {
        yPercent: -100,
        duration: opts.duration != null ? opts.duration : 0.6,
        ease: opts.ease || "power3.inOut",
        stagger: { each: opts.stagger != null ? opts.stagger : 0.08, from: "start" },
        delay: opts.hold != null ? opts.hold : 0.2,
        onComplete: function () {
          wrap.remove();
          root.style.overflow = "";
          if (window.lenis) window.lenis.start();
          resolve();
        }
      });
    });
  });
}
