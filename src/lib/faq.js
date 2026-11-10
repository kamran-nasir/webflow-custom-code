import { hasGsap, prefersReducedMotion, toArray, whenReady } from "./core.js";

/* FAQ ACCORDION (for <details>/<summary> questions)
   The browser's own open/close snaps. This makes the answer slide open and shut (height tween), swaps
   the + / - icon with a quarter turn, and fades the answer. Questions toggle independently.
   Without JS (or with reduced motion) the plain <details> behaviour still works.

   faq({ items: ".question",              // the <details> elements
         icon: ".question-icon",          // inside each item; its text becomes "+" or "-"
         plus: "+", minus: "−" }) */
export function faq(opts) {
  opts = opts || {};
  if (!hasGsap(false) || prefersReducedMotion()) return;
  const gsap = window.gsap;
  const plus = opts.plus || "+", minus = opts.minus || "−";
  whenReady(function () {
    const items = toArray(opts.items);
    const firstClosed = items.filter(function (d) { return !d.open; })[0];
    let openBg = null;                                           // GSAP can't tween var(--x), so resolve it to rgb()
    if (opts.openBg) { const t = document.createElement("i"); t.style.backgroundColor = opts.openBg; document.body.appendChild(t); openBg = getComputedStyle(t).backgroundColor; t.remove(); }
    const closedBg = firstClosed ? getComputedStyle(firstClosed).backgroundColor : "transparent";   // what a closed question looks like
    items.forEach(function (det) {
      const sum = det.querySelector("summary");
      const icon = opts.icon ? det.querySelector(opts.icon) : null;
      const answer = det.querySelector("summary ~ *");
      if (!sum) return;
      if (openBg && det.open) det.style.backgroundColor = openBg;
      let bar = null;                                              // the vertical bar of the SVG plus
      if (icon && opts.svg) {
        const z = opts.svg.size || 31, w = opts.svg.stroke || 1.75, m = 15.375, a = w / 2, e = 30.75 - w / 2;
        icon.textContent = "";
        icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + z + '" height="' + z + '" viewBox="0 0 30.75 30.75" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" style="display:block"><path d="M' + a + " " + m + "H" + e + '"/><path class="fx-v" d="M' + m + " " + a + "V" + e + '"/></svg>';
        bar = icon.querySelector(".fx-v");
        gsap.set(bar, { svgOrigin: m + " " + m, rotation: det.open ? 90 : 0 });
      }
      sum.addEventListener("click", function (e) {
        e.preventDefault();
        gsap.killTweensOf([det, icon, answer]);
        const opening = !det.open;
        const from = det.getBoundingClientRect().height;
        det.style.overflow = "hidden";
        if (opening) det.open = true;
        if (openBg) gsap.to(det, { backgroundColor: opening ? openBg : closedBg, duration: 0.35, ease: "power1.out", clearProps: opening ? "" : "backgroundColor" });
        const to = opening ? (det.style.height = "", det.getBoundingClientRect().height) : sum.getBoundingClientRect().height;
        const done = function () { det.style.height = ""; det.style.overflow = ""; if (!opening) det.open = false; };
        gsap.fromTo(det, { height: from }, { height: to, duration: opening ? 0.45 : 0.35, ease: opening ? "power3.out" : "power2.inOut", onComplete: done });
        if (answer) gsap.fromTo(answer, { opacity: opening ? 0 : 1 }, { opacity: opening ? 1 : 0, duration: 0.3, ease: "power1.out", onComplete: function () { gsap.set(answer, { clearProps: "opacity" }); } });
        if (icon && bar) {
          gsap.to(bar, { rotation: opening ? 90 : 0, duration: 0.45, ease: "power2.inOut" });   // the vertical bar turns flat: plus -> minus
        } else if (icon) {
          icon.textContent = opening ? minus : plus;
          gsap.fromTo(icon, { rotation: opening ? -90 : 90, opacity: 0.3 }, { rotation: 0, opacity: 1, duration: 0.35, ease: "back.out(2)" });
        }
      });
    });
  });
}
