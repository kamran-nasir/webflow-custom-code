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
    toArray(opts.items).forEach(function (det) {
      const sum = det.querySelector("summary");
      const icon = opts.icon ? det.querySelector(opts.icon) : null;
      const answer = det.querySelector("summary ~ *");
      if (!sum) return;
      sum.addEventListener("click", function (e) {
        e.preventDefault();
        gsap.killTweensOf([det, icon, answer]);
        const opening = !det.open;
        const from = det.getBoundingClientRect().height;
        det.style.overflow = "hidden";
        if (opening) det.open = true;
        const to = opening ? (det.style.height = "", det.getBoundingClientRect().height) : sum.getBoundingClientRect().height;
        const done = function () { det.style.height = ""; det.style.overflow = ""; if (!opening) det.open = false; };
        gsap.fromTo(det, { height: from }, { height: to, duration: opening ? 0.45 : 0.35, ease: opening ? "power3.out" : "power2.inOut", onComplete: done });
        if (answer) gsap.fromTo(answer, { opacity: opening ? 0 : 1 }, { opacity: opening ? 1 : 0, duration: 0.3, ease: "power1.out", onComplete: function () { gsap.set(answer, { clearProps: "opacity" }); } });
        if (icon) {
          icon.textContent = opening ? minus : plus;
          gsap.fromTo(icon, { rotation: opening ? -90 : 90, opacity: 0.3 }, { rotation: 0, opacity: 1, duration: 0.35, ease: "back.out(2)" });
        }
      });
    });
  });
}
