import { hasGsap, prefersReducedMotion, toArray, whenReady } from "./core.js";

/* TEXT FILL (words fill in as you scroll)
   The text starts dimmed (opacity 50%) and each word fills to full colour, word by word, scrubbed by the scroll.
   Give it the same trigger/start/end as a scrollLine and the two finish together: the rule beside the text and the
   text fill are one combined effect (the text is fully filled exactly when the rule is fully drawn).

   textFill({ items: ".intro-p",              // the paragraph(s) to fill
              trigger: ".intro-text",          // optional: the element whose scroll range drives it (default: the paragraph's parent)
              from: 0.5,                       // starting opacity
              start: "top 80%", end: "bottom 55%", scrub: 0.6 })   // keep these equal to the scrollLine's

   Reduced motion / no GSAP: the text stays fully visible. */
function wrapWords(el) {
  if (window.SplitText) {
    const s = new window.SplitText(el, { type: "words", wordsClass: "fill-word" });
    return s.words;
  }
  const out = [];
  (function walk(node) {                                   // fallback: wrap every word of every text node
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.nodeValue.split(/(\s+)/).forEach(function (t) {
          if (!t) return;
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); return; }
          const sp = document.createElement("span"); sp.className = "fill-word"; sp.style.display = "inline-block"; sp.textContent = t;
          out.push(sp); frag.appendChild(sp);
        });
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1) walk(n);
    });
  })(el);
  return out;
}

export function textFill(opts) {
  opts = opts || {};
  if (!hasGsap(true) || prefersReducedMotion()) return;
  const gsap = window.gsap;
  const els = toArray(opts.items);
  if (!els.length) return;
  whenReady(function () {
    els.forEach(function (el) {
      const words = wrapWords(el);
      if (!words.length) return;
      const trigger = (opts.trigger && (el.closest(opts.trigger) || document.querySelector(opts.trigger))) || el.parentElement;
      gsap.set(words, { opacity: opts.from != null ? opts.from : 0.5 });
      const per = 1 / words.length;
      gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: trigger, start: opts.start || "top 80%", end: opts.end || "bottom 55%", scrub: opts.scrub != null ? opts.scrub : 0.6 }
      }).to(words, { opacity: 1, duration: per, stagger: per });
    });
    window.ScrollTrigger.refresh();
  });
}
