import { hasGsap, prefersReducedMotion, toArray, whenReady } from "./core.js";

/* CARD ANIMATIONS (scroll-driven). Each effect is optional; list only the ones a page needs.
   Every key takes { items: ".card" } and, optionally, container: ".row" (default: the first card's parent).
   Desktop-only effects (fan, stairs, stack) stay off below 992px, where cards wrap and stack.

   cards({
     fan:     { items: ".card" },   // cards start piled in the middle, fanned like a hand, and spread out (once)
     deck:    { items: ".card", pin: ".section", length: 1500 },   // cards start as a deck (edges peeking above); scrolling deals them out one by one into place (pinned, scrubbed)
     steps:   { items: ".card", pin: ".section", track: ".track", dot: ".dot", dotOn: ".dot-on", seg: ".seg", length: 2400 },
                                     // pinned section: cards climb up into place one by one (low + tilted -> straight) and the
                                     // step track in each card fills (segment draws, dot fills, next segment...) as you scroll
     reveal:  { items: ".card" },   // each card rises and fades in as IT reaches the screen (once, per card)
     stagger: { items: ".card" },   // cards rise and fade in one after another (once)
     stairs:  { items: ".card" },   // cards climb into place one after another AS you scroll (scrubbed)
     stack:   { items: ".card" }    // cards 2..n start hidden behind card 1 and slide out AS you scroll (scrubbed)
   })

   fan and stagger play once when the row reaches about 80% down the screen; stairs and stack follow the
   scrollbar (scroll back up and they fold back). */

const DESKTOP = "(min-width: 992px)";

function parentOf(cfg, els) { return (cfg.container && document.querySelector(cfg.container)) || els[0].parentElement; }

function fan(cfg) {
  const gsap = window.gsap, els = toArray(cfg.items);
  if (els.length < 2) return;
  const rects = els.map(function (e) { return e.getBoundingClientRect(); });
  const mid = (Math.min.apply(null, rects.map(function (r) { return r.left; })) + Math.max.apply(null, rects.map(function (r) { return r.right; }))) / 2;
  const n = els.length;
  const k = function (i) { return i / (n - 1) - 0.5; };            // -0.5 .. 0.5 across the row
  // function values (an array would be read by GSAP as keyframes, not one value per card)
  gsap.from(els, {
    x: function (i) { return (mid - (rects[i].left + rects[i].width / 2)) * 0.6; },
    y: function (i) { return Math.abs(k(i)) * 48; },
    rotation: function (i) { return k(i) * 30; },
    duration: 0.9, ease: "power3.out", stagger: { each: 0.05, from: "center" },
    scrollTrigger: { trigger: parentOf(cfg, els), start: "top 80%", once: true }
  });
}

function deck(cfg) {
  const gsap = window.gsap, els = toArray(cfg.items);
  if (els.length < 2) return;
  const n = els.length;
  const rects = els.map(function (e) { return e.getBoundingClientRect(); });
  const mid = (Math.min.apply(null, rects.map(function (r) { return r.left; })) + Math.max.apply(null, rects.map(function (r) { return r.right; }))) / 2;
  const peek = cfg.peek != null ? cfg.peek : 18;                    // px of each card's top edge showing above the one in front
  const tilt = [0, -3, 3, -2, 2, -3];
  els.forEach(function (e, i) { e.style.zIndex = String(n - i); });  // first card on top of the deck, dealt first
  const tl = gsap.timeline({
    defaults: { ease: "power3.out", duration: 1 },
    scrollTrigger: {
      trigger: (cfg.pin && document.querySelector(cfg.pin)) || els[0].parentElement,
      start: cfg.start || "top top", end: "+=" + (cfg.length || 1500),
      pin: true, scrub: 0.8, anticipatePin: 1,
      refreshPriority: 10                         // pins refresh FIRST, so every trigger below them is measured after their spacing
    }
  });
  els.forEach(function (el, i) {
    tl.from(el, {
      x: mid - (rects[i].left + rects[i].width / 2),
      y: -i * peek,
      rotation: tilt[i % tilt.length]
    }, i * 0.9);
  });
}

function steps(cfg) {
  const gsap = window.gsap, els = toArray(cfg.items);
  if (!els.length) return;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: (cfg.pin && document.querySelector(cfg.pin)) || els[0].parentElement,
      start: cfg.start || "center center", end: "+=" + (cfg.length || 2400),
      pin: true, scrub: 0.8, anticipatePin: 1,
      refreshPriority: 9
    }
  });
  let t = 0, idx = 0;
  els.forEach(function (card) {
    const track = card.querySelector(cfg.track || ".track");
    const dots = track ? toArray(track.querySelectorAll(cfg.dot || ".dot")) : [];
    const segs = track ? toArray(track.querySelectorAll(cfg.seg || ".seg")) : [];
    const first = (cfg.dotOn && track && track.querySelector(cfg.dotOn)) || dots[0];
    const on = first ? getComputedStyle(first) : null;
    // each card starts low and tilted (no fade) and climbs into place on its turn; no card is ever dimmed
    gsap.set(card, { y: 140, rotation: idx % 2 ? 4 : -4, scale: 0.94 });
    tl.to(card, { y: 0, rotation: 0, scale: 1, duration: 0.7, ease: "power2.out" }, t);
    idx++;
    const fills = segs.map(function (seg) {                       // faint track + a fill that grows over it
      const color = getComputedStyle(seg).backgroundColor;
      seg.style.position = "relative"; seg.style.background = "transparent";
      const base = document.createElement("span"), fill = document.createElement("span");
      base.style.cssText = "position:absolute;inset:0;opacity:0.22;background:" + color + ";";
      fill.style.cssText = "position:absolute;inset:0;background:" + color + ";transform-origin:left center;";
      seg.appendChild(base); seg.appendChild(fill);
      gsap.set(fill, { scaleX: 0 });
      return fill;
    });
    const filled = dots.filter(function (d) { return d !== first; });
    const at = t + 0.5;
    fills.forEach(function (fill, j) {
      tl.to(fill, { scaleX: 1, duration: 0.3 }, at + j * 0.5);
      if (filled[j] && on) tl.to(filled[j], { backgroundColor: on.backgroundColor, borderColor: on.borderTopColor, duration: 0.2 }, at + j * 0.5 + 0.3);
    });
    t += 0.5 + fills.length * 0.5 + 0.2;
  });
}

function reveal(cfg) {
  const gsap = window.gsap, els = toArray(cfg.items);
  els.forEach(function (el) {
    gsap.from(el, { autoAlpha: 0, y: 70, scale: 0.95, duration: 0.8, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 92%", once: true } });
  });
}

function stagger(cfg) {
  const gsap = window.gsap, els = toArray(cfg.items);
  if (!els.length) return;
  gsap.from(els, {
    autoAlpha: 0, y: 48, scale: 0.97, duration: 0.8, ease: "power3.out", stagger: 0.12,
    scrollTrigger: { trigger: parentOf(cfg, els), start: "top 80%", once: true }
  });
}

function stairs(cfg) {
  const gsap = window.gsap, els = toArray(cfg.items);
  if (!els.length) return;
  gsap.from(els, {
    y: 120, rotation: function (i) { return i % 2 ? 4 : -4; }, scale: 0.94, opacity: 0.4, ease: "none", stagger: 0.25,
    scrollTrigger: { trigger: parentOf(cfg, els), start: "top 90%", end: "top 25%", scrub: 0.8 }
  });
}

function stack(cfg) {
  const gsap = window.gsap, els = toArray(cfg.items);
  if (els.length < 2) return;
  const left0 = els[0].getBoundingClientRect().left;
  els.forEach(function (e, i) { e.style.position = e.style.position || "relative"; e.style.zIndex = String(els.length - i); });
  gsap.from(els.slice(1), {
    x: function (i, el) { return left0 - el.getBoundingClientRect().left; }, ease: "none",
    scrollTrigger: { trigger: parentOf(cfg, els), start: "top 85%", end: "top 30%", scrub: 0.8 }
  });
}

export function cards(opts) {
  opts = opts || {};
  if (!hasGsap(true) || prefersReducedMotion()) return;
  const gsap = window.gsap;
  whenReady(function () {
    if (opts.stagger) stagger(opts.stagger);
    gsap.matchMedia().add(DESKTOP, function () {
      if (opts.fan) fan(opts.fan);
      if (opts.deck) deck(opts.deck);
      if (opts.reveal) reveal(opts.reveal);
      if (opts.stairs) stairs(opts.stairs);
      if (opts.steps) steps(opts.steps);
      if (opts.stack) stack(opts.stack);
    });
    window.ScrollTrigger.refresh();
  });
}
