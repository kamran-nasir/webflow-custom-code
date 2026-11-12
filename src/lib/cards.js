import { hasGsap, prefersReducedMotion, toArray, whenReady } from "./core.js";

/* CARD ANIMATIONS (scroll-driven). Each effect is optional; list only the ones a page needs.
   Every key takes { items: ".card" } and, optionally, container: ".row" (default: the first card's parent).
   Desktop-only effects (fan, stairs, stack) stay off below 992px, where cards wrap and stack.

   cards({
     fan:     { items: ".card" },   // cards start piled in the middle, fanned like a hand, and spread out (once)
     deck:    { items: ".card", pin: ".section", length: 1500 },   // cards start as a deck (edges peeking above); scrolling deals them out one by one into place (pinned, scrubbed)
     stickFill: { items: ".card", container: ".row", track: ".track", dot: ".dot", dotOn: ".dot-on", seg: ".seg" },
                                     // Halloween-style: the stair-step + sticky layout is CSS in Webflow; this fills each card's step track on its turn
     steps:   { items: ".card", pin: ".section", track: ".track", dot: ".dot", dotOn: ".dot-on", seg: ".seg", length: 2400 },
                                     // pinned section: cards climb up into place one by one (low + tilted -> straight) and the
                                     // step track in each card fills (segment draws, dot fills, next segment...) as you scroll
     reveal:  { items: ".card" },   // each card rises and fades in as IT reaches the screen (once, per card)
     stagger: { items: ".card" },   // cards rise and fade in one after another (once)
     stairs:  { items: ".card" },   // cards climb into place one after another AS you scroll (scrubbed)
     slideUp: [{ items: ".card", container: ".row" }]   // PHONE sliders only (<=767px): the cards of each slider row rise and fade in one after another when the row scrolls into view (once)
     stack:   { items: ".card" }    // cards 2..n start hidden behind card 1 and slide out AS you scroll (scrubbed)
   })

   fan and stagger play once when the row reaches about 80% down the screen; stairs and stack follow the
   scrollbar (scroll back up and they fold back). */

const DESKTOP = "(min-width: 992px)";
const PHONE = "(max-width: 767px)";

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

// PIN EASING (shared by deck and stage). A pinned section is perfectly still while the page around it moves at full scroll speed, so the SPEED
// jumps at both ends of the pin (1 -> 0 when it locks, 0 -> 1 when it lets go; scrolling back up it is the same in reverse). Positions are
// continuous, speed is not, and that reads as a jerk. To ramp the speed smoothly the content must lag the page a little around each edge:
// over a window of R scroll px centred on the edge (R/2 before it, R/2 after) its offset follows a quadratic hump that peaks at R/8 at the edge
// and is ZERO outside the window, so nothing is left displaced (no extra gaps above/below the section). The two halves use different CSS
// properties so they never fight: BEFORE/AFTER the pin the offset is `top` (children are made position:relative; one scrubbed timeline spans
// the whole range), INSIDE the pin it is `y` (the pin timeline). `top` + `y` sum to the hump; top keeps its end value and y cancels it.
//   enter: top 0 -> +P (ease-in, before the lock) then y 0 -> -P (ease-out, after the lock)        [P = R/8]
//   exit : y -P -> -(P+Q) (ease-in, before the release) then top +P -> +(P+Q) (ease-out, after)    [Q = R_exit/8]
// Call it AFTER the pin timeline is built (it needs the total length to turn units into scroll px).
// ONCE: after the first complete pass the pin is removed for good (so scrolling back shows all the content, no sticky/pinned scrolling). The pin
// adds L = end - start px of scroll space; removing it moves everything below up by L, so the scroll position is moved up by L in the SAME frame
// (and Lenis's internal position/target too, so the momentum is not cut) and nothing visibly jumps. Killing the triggers reverts the pin and the
// animations to the natural (finished) layout; `after` re-applies anything that revert resets (step dots).
// Registry of pins that are still waiting for their first pass (see anchor handling below).
const oncePins = [];
let anchorHandlerInstalled = false;
function installAnchorRelease() {
  if (anchorHandlerInstalled) return;
  anchorHandlerInstalled = true;
  // A menu/anchor click jumps over pins that are ahead of the viewport. Lenis computes the destination ONCE (with the pins' scroll space in
  // it), so if a pin were released mid-flight the page would land too far down. So release every unplayed pin that lies between the viewport
  // and the target FIRST (nothing to compensate: it is below the viewport), and let Lenis compute the destination against the final layout.
  // A target inside a pinned section is left alone (that pin stays, the link lands on it).
  document.addEventListener("click", function (e) {
    const a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    const id = a.getAttribute("href");
    if (!id || id.length < 2) return;
    let target = null;
    try { target = document.querySelector(id); } catch (err) { return; }
    if (!target) return;
    const tTop = target.getBoundingClientRect().top + window.scrollY, y = window.scrollY;
    oncePins.slice().forEach(function (p) {
      if (p.done) return;
      if (p.st.start > y && p.st.end <= tTop - 1) p.release(true);
    });
  }, true);
}

// ONCE: after the first complete pass the pin is removed for good (so scrolling back shows all the content, no sticky/pinned scrolling). The pin
// adds L = end - start px of scroll space; removing it moves everything below it up by L, so when the user is BELOW the pin the scroll position is
// moved up by L in the SAME frame (and Lenis's internal position/target too, so the momentum is not cut) and nothing visibly jumps. Killing the
// triggers reverts the pin and the animations to the natural (finished) layout; `after` re-applies anything that revert resets (step dots).
// noShift = true when the pin is still below the viewport (anchor click): nothing above it moves, so no compensation.
function releasePin(st, outerSt, after, noShift, finalize) {
  const lenis = window.lenis, L = noShift ? 0 : st.end - st.start, y = window.scrollY;
  const target = lenis ? lenis.targetScroll : 0, anim = lenis ? lenis.animatedScroll : 0;
  const apply = finalize ? finalize() : null;   // snapshot the FINISHED card positions: killing the trigger reverts a from()/fromTo() tween to its START state (cards stacked / below the section)
  outerSt.kill(); st.kill();
  if (apply) apply();
  if (after) after();
  if (L) {
    window.scrollTo(0, y - L);
    if (lenis) { lenis.animatedScroll = anim - L; lenis.targetScroll = target - L; }
  }
  window.ScrollTrigger.update();
  window.ScrollTrigger.refresh();
}

function easePin(tl, st, pinEl, length, cfg, after, cards) {
  const gsap = window.gsap;
  const enter = cfg.enter != null ? cfg.enter : 1, exit = cfg.exit != null ? cfg.exit : 1;
  const kids = Array.prototype.slice.call(pinEl.children);
  kids.forEach(function (k) { if (getComputedStyle(k).position === "static") gsap.set(k, { position: "relative" }); });
  const perUnit = length / (tl.duration() + exit / 2);                 // scroll px per timeline unit (the exit's in-pin half adds exit/2 units)
  const Hin = enter * perUnit / 2, Hout = exit * perUnit / 2;           // half-window lengths in scroll px
  const P = Hin / 4, Q = Hout / 4;                                      // peak offsets
  if (enter > 0) tl.fromTo(kids, { y: 0 }, { y: -P, ease: "power1.out", duration: enter / 2 }, 0);
  if (exit > 0) tl.to(kids, { y: -(P + Q), ease: "power1.in", duration: exit / 2 }, tl.duration());
  const finalize = cards && cards.length ? function () {                // finished state of the cards, read from the pin timeline at progress 1
    tl.progress(1);
    const rec = cards.map(function (e) { return { e: e, x: +gsap.getProperty(e, "x") || 0, y: +gsap.getProperty(e, "y") || 0, r: +gsap.getProperty(e, "rotation") || 0, sc: +gsap.getProperty(e, "scale") || 1 }; });
    return function () { rec.forEach(function (c) { gsap.set(c.e, { x: c.x, y: c.y, rotation: c.r, scale: c.sc }); }); };
  } : null;
  const reg = { st: st, done: false, release: null };
  if (cfg.once) { installAnchorRelease(); oncePins.push(reg); }
  const outerTl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: pinEl, scrub: true, invalidateOnRefresh: true,
      start: function () { return st.start - Hin; }, end: function () { return st.end + Hout; },
      refreshPriority: (st.vars.refreshPriority || 9) - 1,            // refresh after the pin trigger so st.start / st.end are current
      onLeave: function (self) { if (cfg.once && !reg.done) { reg.done = true; releasePin(st, self, after, false, finalize); } }   // once: the exit hump is over, the content is back at zero offset: release the pin for good
    }
  })
    .fromTo(kids, { top: 0 }, { top: P, ease: "power1.in", duration: Hin }, 0)
    .fromTo(kids, { top: P }, { top: P + Q, ease: "power1.out", duration: Hout, immediateRender: false }, Hin + length);
  reg.release = function (noShift) { if (reg.done) return; reg.done = true; releasePin(st, outerTl.scrollTrigger, after, noShift, finalize); };
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
      pin: true, scrub: cfg.scrub != null ? cfg.scrub : true,   // scrub:true = follows the scroll exactly (Lenis already smooths it); any lag delays the enter/exit ease and re-creates the speed jump. No anticipatePin: it locks the pin a few px early, which stops the content dead before the enter ease can start.
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
  // HOLD: an empty tail so the pin keeps going after the last card has landed. Without it the pin releases on the very frame the last card settles and the next section slides in over it. hold is in timeline units (the deal spacing is 0.9, one card's move is 1); scroll length per unit = length / total, so raise `length` by the same share to keep the dealing pace.
  if (cfg.hold) tl.to({}, { duration: cfg.hold });
  easePin(tl, tl.scrollTrigger, (cfg.pin && document.querySelector(cfg.pin)) || els[0].parentElement, cfg.length || 1500, cfg, null, els);
}

// Prepares one card's step track (faint track + a fill over each segment) and returns a function that adds
// the fill sequence to a timeline at a time: segment draws, next dot fills, next segment...
function prepTrack(card, cfg) {
  const gsap = window.gsap;
  const track = card.querySelector(cfg.track || ".track");
  const dots = track ? toArray(track.querySelectorAll(cfg.dot || ".dot")) : [];
  const segs = track ? toArray(track.querySelectorAll(cfg.seg || ".seg")) : [];
  const first = (cfg.dotOn && track && track.querySelector(cfg.dotOn)) || dots[0];
  const on = first ? getComputedStyle(first) : null;
  const onBg = on && on.backgroundColor, onBorder = on && on.borderTopColor;
  const offDot = dots.filter(function (d) { return d !== first; })[0];
  const off = offDot ? getComputedStyle(offDot) : null;
  let offBg = off && off.backgroundColor, offBorder = off && off.borderTopColor;
  if (on && (!off || (offBg === onBg && offBorder === onBorder))) {   // design has no distinct empty dot (e.g. white on dark): use a ring
    offBg = getComputedStyle(card).backgroundColor; offBorder = onBg;
  }
  const fills = segs.map(function (seg) {
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
  if (cfg.hollowFirst && on) gsap.set(dots, { backgroundColor: offBg, borderColor: offBorder });   // every step starts empty (a ring)
  const fillDot = function (tl, dot, at, dur) { tl.to(dot, { backgroundColor: onBg, borderColor: onBorder, duration: dur, ease: "none" }, at); };
  return {
    length: fills.length * 0.5,
    // time-based sequence used by the pinned and play-once versions (first dot already on)
    add: function (tl, at) {
      fills.forEach(function (fill, j) {
        tl.to(fill, { scaleX: 1, duration: 0.3, ease: "none" }, at + j * 0.5);
        if (filled[j] && on) fillDot(tl, filled[j], at + j * 0.5 + 0.3, 0.2);
      });
    },
    // scrubbed sequence: fills steps 1..count (dot, segment, dot, ...) across the timeline; scroll back and it empties again
    addSteps: function (tl, count, at, speed) {   // at = start position in tl (default 0); speed = duration multiplier (default 1, 0.5 = twice as fast)
      const sp = speed || 1, n = Math.min(count, dots.length);
      let t = at || 0;
      for (let k = 0; k < n; k++) {
        if (k > 0 && fills[k - 1]) { tl.to(fills[k - 1], { scaleX: 1, duration: sp, ease: "none" }, t); t += sp; }
        if (on) fillDot(tl, dots[k], t, 0.5 * sp);
        t += 0.5 * sp;
      }
      // returns where this fill ends in tl and a function that sets every one of its steps to the finished state (used by `keep`)
      return {
        end: t,
        finish: function () {
          gsap.set(fills.slice(0, Math.max(0, n - 1)), { scaleX: 1 });
          if (on) gsap.set(dots.slice(0, n), { backgroundColor: onBg, borderColor: onBorder });
        }
      };
    }
  };
}

// PINNED version: the section is pinned and the cards climb in one by one while the tracks fill (scrubbed).
function steps(cfg) {
  const gsap = window.gsap, els = toArray(cfg.items);
  if (!els.length) return;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: (cfg.pin && document.querySelector(cfg.pin)) || els[0].parentElement,
      start: cfg.start || "top top", end: "+=" + (cfg.length || 2400),
      pin: true, scrub: 0.8, anticipatePin: 1,
      refreshPriority: 9
    }
  });
  let t = 0, idx = 0;
  els.forEach(function (card) {
    const pt = prepTrack(card, cfg);
    gsap.set(card, { y: 140, rotation: idx % 2 ? 4 : -4, scale: 0.94 });
    tl.to(card, { y: 0, rotation: 0, scale: 1, duration: 0.7, ease: "power2.out" }, t);
    idx++;
    pt.add(tl, t + 0.5);
    t += 0.5 + pt.length + 0.2;
  });
}

// STICKY version (matches the Halloween master's process cards): the stair-step layout and the sticky pinning are
// CSS in Webflow (position: sticky, margin-top 0/300/600/900, alternating tilt). This fills each card's step track and
// it is tied to the scrollbar: card 1 fills step 1, card 2 steps 1-2, card 3 steps 1-3, and so on. The fill runs while that
// card's natural position travels from `from` to `to` of the screen height; scroll back up and it empties again.
function stickFill(cfg) {
  const gsap = window.gsap, els = toArray(cfg.items);
  if (!els.length) return;
  const row = parentOf(cfg, els);
  els.forEach(function (card, idx) {
    const pt = prepTrack(card, Object.assign({ hollowFirst: true }, cfg));
    const margin = parseFloat(getComputedStyle(card).marginTop) || 0;
    let fill = null;
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: row, start: "top+=" + margin + " " + (cfg.from || "78%"), end: "top+=" + margin + " " + (cfg.to || "38%"), scrub: cfg.scrub != null ? cfg.scrub : 0.6,
        onLeave: function (self) { if (cfg.keep) gsap.delayedCall(0.85, function () { self.kill(); if (fill) fill.finish(); }); }   // keep: stays filled after the first time (wait for the scrub to catch up; kill resets the timeline, so set the finished state AFTER it)
      }
    });
    fill = pt.addSteps(tl, idx + 1);
  });
}

// STAGE version (pinned whole section): the section (heading, sub-heading AND the cards) is pinned in the middle of the window.
// The sticky stair-step layout from Webflow is flattened into one row (inline, reverted when the media query stops matching) and the
// cards instead climb up into place one by one (scrubbed, low + tilted -> final tilt), each filling its step track (card 1 step 1 ...
// card 4 steps 1-4). After the last card lands the pin holds for `hold` timeline units so the finished section rests before the next
// one arrives. Only runs where the whole section fits in the window (see cards(): stage.minHeight); otherwise stickFill is used.
function stage(cfg) {
  const gsap = window.gsap, els = toArray(cfg.items);
  if (els.length < 2) return;
  const row = parentOf(cfg, els);
  const pinEl = (cfg.pin && document.querySelector(cfg.pin)) || row.parentElement;
  const tilt = els.map(function (e) {                                  // final tilt = the CSS rotate on each card (read before it is overwritten)
    const m = /matrix\(([^)]+)\)/.exec(getComputedStyle(e).transform);
    if (!m) return 0;
    const v = m[1].split(",").map(parseFloat);
    return Math.atan2(v[1], v[0]) * 180 / Math.PI;
  });
  gsap.set(row, { minHeight: 0 });                                     // drop the "rest" height used by the sticky layout
  gsap.set(els, { position: "relative", top: "auto", marginTop: 0 });  // flat row: no sticky, no stair offsets
  const rise = function () { return window.innerHeight * 0.55 + 40; }; // start below the bottom edge of the window, whatever its height
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: pinEl, start: cfg.start || "center center", end: "+=" + (cfg.length || 2200),
      pin: true, scrub: cfg.scrub != null ? cfg.scrub : true, invalidateOnRefresh: true,   // scrub:true and no anticipatePin: see deck()
      refreshPriority: 9
    }
  });
  const latches = [];
  els.forEach(function (card, i) {                                     // strictly one card at a time: climb, then its steps fill to the end, THEN the next card starts
    const T = i ? tl.duration() + (cfg.gap != null ? cfg.gap : 0.15) : 0;
    const pt = prepTrack(card, Object.assign({ hollowFirst: true }, cfg));
    tl.fromTo(card, { y: rise, rotation: tilt[i] * 2 }, { y: 0, rotation: tilt[i], duration: 1, ease: "power2.out" }, T);
    const fill = pt.addSteps(tl, i + 1, T + 1, 0.5);                   // starts when the card has landed; tl.duration() is now the end of this card's fill
    latches.push({ end: fill.end, finish: fill.finish, done: false });
  });
  if (cfg.keep) {                                                      // keep: a card's steps stay filled after the first time (the cards themselves still move back with the scroll)
    tl.eventCallback("onUpdate", function () {
      const t = tl.time();
      latches.forEach(function (l) {
        if (!l.done && t >= l.end - 0.001) l.done = true;
        if (l.done && t < l.end) l.finish();                          // runs after the tweens rendered, so it wins over the reversed fill
      });
    });
  }
  if (cfg.hold) tl.to({}, { duration: cfg.hold });
  easePin(tl, tl.scrollTrigger, pinEl, cfg.length || 2200, cfg, function () { latches.forEach(function (l) { l.finish(); }); }, els);   // enter + exit speed ramps (see easePin); `after` keeps the dots filled once the pin is released; els = the cards whose finished position is kept
}

// PHONE version: the step cards are a horizontal scroll-snap slider. Whenever a card becomes the active slide its step
// track fills (card 1 fills step 1, card 2 steps 1-2 ...) and it empties again when the card leaves, so every slide change
// replays the step animation. Nothing plays until the row has scrolled into view. Returns a cleanup for gsap.matchMedia.
function slideFill(cfg) {
  const gsap = window.gsap, els = toArray(cfg.items);
  if (!els.length || !window.IntersectionObserver) return;
  const row = parentOf(cfg, els);
  let armed = false;
  const live = els.map(function () { return false; });
  const tls = els.map(function (card, idx) {
    const pt = prepTrack(card, Object.assign({ hollowFirst: true }, cfg));
    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    pt.addSteps(tl, idx + 1);
    tl.duration(0.6 + 0.35 * idx);                                    // a longer sequence for later cards, about 0.6 to 1.7 s
    return tl;
  });
  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      const i = els.indexOf(en.target);
      live[i] = en.isIntersecting;
      if (!en.isIntersecting) tls[i].pause(0);
      else if (armed) tls[i].restart();
    });
  }, { root: row, threshold: 0.6 });
  els.forEach(function (c) { io.observe(c); });
  const st = window.ScrollTrigger.create({ trigger: row, start: "top 85%", once: true, onEnter: function () { armed = true; els.forEach(function (c, i) { if (live[i]) tls[i].restart(); }); } });
  return function () { io.disconnect(); st.kill(); tls.forEach(function (t) { t.kill(); }); };
}

// PHONE sliders: cfg is one { items, container } or a list of them. Each row's cards rise and fade in, staggered, when the row
// reaches ~85% down the screen (once). Every card is included (also those off-screen to the right) so a swipe never shows a hidden one.
function slideUp(cfg) {
  const gsap = window.gsap;
  (Array.isArray(cfg) ? cfg : [cfg]).forEach(function (c) {
    const els = toArray(c.items);
    if (!els.length) return;
    gsap.from(els, {
      autoAlpha: 0, y: 48, duration: 0.8, ease: "power3.out", stagger: 0.12, clearProps: "opacity,visibility,transform",
      scrollTrigger: { trigger: parentOf(c, els), start: "top 85%", once: true }
    });
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
    scrollTrigger: {
      trigger: parentOf(cfg, els), start: "top 85%", end: "top 30%", scrub: 0.8,
      onLeave: function (self) { if (cfg.once) gsap.delayedCall(1.05, function () { self.kill(); gsap.set(els.slice(1), { x: 0 }); }); }       // once: after the first slide-out the cards stay in place. Wait for the scrub (0.8 s) to catch up so the last part does not snap; killing reverts a from() tween to its START state, so set the finished x AFTER it
    }
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
      if (opts.stickFill && !opts.stage) stickFill(opts.stickFill);   // with `stage`, stickFill only runs on short windows (below)
      if (opts.stack) stack(opts.stack);
    });
    if (opts.stage) {                                                  // pinned whole section when it fits the window, sticky stair-step otherwise
      const minH = opts.stage.minHeight || 720;
      gsap.matchMedia().add(DESKTOP + " and (min-height: " + minH + "px)", function () { stage(opts.stage); });
      gsap.matchMedia().add(DESKTOP + " and (max-height: " + (minH - 1) + "px)", function () { if (opts.stickFill) stickFill(opts.stickFill); });
    }
    gsap.matchMedia().add(PHONE, function () {
      if (opts.slideUp) slideUp(opts.slideUp);
      if (opts.stickFill) return slideFill(opts.stickFill);
    });
    window.ScrollTrigger.refresh();
  });
}
