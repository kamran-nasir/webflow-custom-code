import { hasGsap, prefersReducedMotion, toArray, whenReady } from "./core.js";

/* SCROLL LINE (a vertical rule that draws as you scroll)
   Takes an element's left border (e.g. the black rule beside a block of text), hides the border and
   replaces it with a bar of the same colour and width that grows from the top down while the element
   scrolls through the viewport (scrubbed: scroll back up and it shrinks again). Layout does not move,
   the border keeps its width, it just turns transparent.

   scrollLine({ items: ".block-with-left-border", start: "top 80%", end: "bottom 55%", scrub: 0.6, keep: false })   // keep: true = stays drawn after the first time

   Reduced motion / no GSAP: the border is left alone. */
export function scrollLine(opts) {
  opts = opts || {};
  if (!hasGsap(true) || prefersReducedMotion()) return;
  const gsap = window.gsap;
  const els = toArray(opts.items);
  if (!els.length) return;

  const d = opts.desktop && window.matchMedia("(min-width: 992px)").matches ? opts.desktop : {};   // optional desktop-only start/end
  whenReady(function () {
    els.forEach(function (el) {
      const cs = getComputedStyle(el);
      const w = parseFloat(cs.borderLeftWidth);
      if (!w || cs.borderLeftStyle === "none") return;
      if (cs.position === "static") el.style.position = "relative";
      const bar = document.createElement("span");
      bar.setAttribute("aria-hidden", "true");
      bar.style.cssText = "position:absolute;top:0;bottom:0;left:" + (-w) + "px;width:" + w + "px;background:" + cs.borderLeftColor + ";transform-origin:top;pointer-events:none;";
      el.appendChild(bar);
      el.style.borderLeftColor = "transparent";
      const tw = gsap.fromTo(bar, { scaleY: 0 }, {
        scaleY: 1, ease: "none",
        scrollTrigger: {
          trigger: (d.trigger && el.closest(d.trigger)) || el, start: d.start || opts.start || "top 80%", end: d.end || opts.end || "bottom 55%", scrub: opts.scrub != null ? opts.scrub : 0.6,
          onLeave: function (self) { if (opts.keep) { tw.progress(1); self.kill(); } }   // keep: once drawn, it stays drawn when you scroll back
        }
      });
    });
    window.ScrollTrigger.refresh();
  });
}
