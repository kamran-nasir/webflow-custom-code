// Version marker: check the browser console for this line to be sure the NEW file is the one loading
console.info("[hero-animations] v12 loaded", { gsap: typeof gsap, ScrollTrigger: typeof ScrollTrigger, MotionPathPlugin: typeof MotionPathPlugin, Lenis: typeof Lenis });

// Register whichever GSAP plugins are loaded on the page (skips any that aren't,
// so a missing plugin can never stop the rest of this file from running)
if (window.gsap) {
  [window.ScrollTrigger, window.MotionPathPlugin, window.SplitText].forEach(function (p) {
    if (p) gsap.registerPlugin(p);
  });
}
(function () {
  // No smooth scroll for people who asked for less motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof Lenis === "undefined") return;

  const lenis = new Lenis({
    lerp: 0.1,              // smoothness: lower = smoother/slower (0.05–0.15 is a good range)
    wheelMultiplier: 1,     // scroll distance per wheel tick
    smoothWheel: true,
    anchors: true           // nav links like #about / #faqs scroll smoothly too
  });
  window.lenis = lenis;     // handy for other scripts: lenis.stop(), lenis.start(), lenis.scrollTo("#faqs")

  if (window.gsap && window.ScrollTrigger) {
    // Keep ScrollTrigger (monster card trigger etc.) in sync with the smooth scroll
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    // Fallback if GSAP isn't on the page
    (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(performance.now());
  }
})();



  document.querySelectorAll(".underline_path").forEach((path) => {
    const length = path.getTotalLength();

    // Hide the line by offsetting its full length, then draw it in
    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length
    });

    gsap.to(path, {
      strokeDashoffset: 0,
      duration: 1.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: path,
        start: "top 85%",
        toggleActions: "play none none none"
      }
    });
  });

(function () {
  gsap.registerPlugin(MotionPathPlugin);

  const wrap  = document.getElementById("batWrap");
  if (!wrap) return;
  const wingL = document.getElementById("wingLeft");
  const wingR = document.getElementById("wingRight");
  const slot  = wrap.querySelector(".bat_body[data-svg]");

  // Face parts (filled in once the body SVG is loaded inline)
  let lids = [], pupils = [], mouth = [], glint = null;

  let flapTweenL = null;
  let flapTweenR = null;
  let idleTween  = null;
  let faceIdle   = [];

  // ---------- load the body SVG inline so we can reach the eyes and fangs ----------
  const svgReady = fetch(slot.dataset.svg)
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (txt) {
      slot.innerHTML = txt;
      const svg = slot.querySelector("svg");
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      lids   = svg.querySelectorAll(".bat_lid-rect");
      pupils = svg.querySelectorAll(".bat_pupil");
      mouth  = svg.querySelectorAll(".bat_mouth");
      glint  = svg.querySelector(".bat_glint");
      gsap.set(mouth, { svgOrigin: "188 129" });     // top of the mouth
      gsap.set(glint, { svgOrigin: "205 133", scale: 0, opacity: 1 });
    })
    .catch(function (err) {
      console.warn("Bat body SVG could not be loaded inline:", err);
      slot.innerHTML = '<img src="' + slot.dataset.svg + '" alt="">';   // still flies, just no face animation
    });

  const pageLoaded = new Promise(function (res) {
    if (document.readyState === "complete") res(); else window.addEventListener("load", res);
  });

  // ---------- wings ----------
  // One continuous sine oscillation per wing, mirrored.
  function flapWings(fast) {
    if (flapTweenL) flapTweenL.kill();
    if (flapTweenR) flapTweenR.kill();

    const duration = fast ? 0.16 : 0.55;
    const angle = fast ? 30 : 10;

    gsap.set([wingL, wingR], { rotate: 0 });
    flapTweenL = gsap.to(wingL, { rotate: -angle, duration, ease: "sine.inOut", yoyo: true, repeat: -1 });
    flapTweenR = gsap.to(wingR, { rotate: angle,  duration, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }

  function stopFlap() {
    if (flapTweenL) flapTweenL.kill();
    if (flapTweenR) flapTweenR.kill();
    flapTweenL = flapTweenR = null;
  }

  // ---------- face ----------
  function lidsTo(h, dur, ease) {           // 0 = eyes open, 9 = squint, 30 = closed
    return gsap.to(lids, { attr: { height: h }, duration: dur, ease: ease || "power2.inOut" });
  }

  function blink() {
    if (!lids.length) return;
    gsap.timeline()
      .to(lids, { attr: { height: 30 }, duration: 0.07, ease: "power2.in" })
      .to(lids, { attr: { height: 0 },  duration: 0.12, ease: "power2.out" }, "+=0.04");
  }

  function fangFlash() {                    // fangs stretch a touch + a sparkle on the right fang
    if (!mouth.length) return;
    gsap.timeline()
      .to(mouth, { scaleY: 1.3, duration: 0.12, ease: "power2.out" })
      .to(mouth, { scaleY: 1, duration: 0.3, ease: "back.out(3)" })
      .fromTo(glint, { scale: 0, rotate: 0 }, { scale: 1, rotate: 90, duration: 0.18, ease: "power2.out" }, 0.1)
      .to(glint, { scale: 0, rotate: 180, duration: 0.22, ease: "power2.in" }, 0.32);
  }

  function startFaceIdle() {
    stopFaceIdle();
    if (!lids.length) return;
    // Blink every 3–5s (sometimes a double blink)
    (function nextBlink() {
      faceIdle.push(gsap.delayedCall(gsap.utils.random(3, 5), function () {
        blink();
        if (Math.random() < 0.25) gsap.delayedCall(0.28, blink);
        nextBlink();
      }));
    })();
    // Eyes glance left/right every so often (paused while the eyes follow the cursor)
    glanceTl = gsap.timeline({ repeat: -1, repeatDelay: 4.2, delay: 2.2, paused: tracking });
    faceIdle.push(glanceTl
      .to(pupils, { x: -3, duration: 0.14, ease: "power2.out" })
      .to(pupils, { x: 2,  duration: 0.16, ease: "power2.inOut" }, "+=0.7")
      .to(pupils, { x: 0,  duration: 0.14, ease: "power2.out" }, "+=0.5"));
    // (re)create the cursor-follow tweens here, after any reset has cleared old tweens
    pX = gsap.quickTo(pupils, "x", { duration: 0.3, ease: "power3.out" });
    pY = gsap.quickTo(pupils, "y", { duration: 0.3, ease: "power3.out" });
    canTrack = true;
    // Fang glint every ~6s
    faceIdle.push(gsap.timeline({ repeat: -1, repeatDelay: 5.5, delay: 3.5 }).call(fangFlash));
  }

  function stopFaceIdle() {
    faceIdle.forEach(function (t) { t.kill(); });
    faceIdle = [];
    glanceTl = null;
    canTrack = false;
    tracking = false;
  }

  // ---------- eyes follow the cursor when it comes near ----------
  const FOLLOW_RADIUS = 400;   // px from the bat's face where the eyes start following
  const MAX_X = 3.5, MAX_Y = 2.5;   // how far the pupils can move (in the SVG's own units)
  let glanceTl = null, canTrack = false, tracking = false, pX = null, pY = null;

  function stopTracking() {
    if (!tracking) return;
    tracking = false;
    pX(0); pY(0);
    if (glanceTl) glanceTl.resume();
  }

  function setupCursorFollow() {
    if (!pupils.length) return;
    window.addEventListener("pointermove", function (e) {
      if (!canTrack || e.pointerType === "touch") return;   // mouse/trackpad only
      const r  = wrap.getBoundingClientRect();
      const cx = r.left + r.width * 0.60;     // between the eyes
      const cy = r.top  + r.height * 0.30;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > FOLLOW_RADIUS) { stopTracking(); return; }
      if (!tracking) {
        tracking = true;
        if (glanceTl) glanceTl.pause();
      }
      const reach = Math.min(dist / 120, 1);  // small moves when the cursor is right on the face
      pX(dist ? (dx / dist) * MAX_X * reach : 0);
      pY(dist ? (dy / dist) * MAX_Y * reach : 0);
    }, { passive: true });

    document.documentElement.addEventListener("mouseleave", stopTracking);
  }

  function resetFace() {
    if (!lids.length) return;
    gsap.killTweensOf([lids, pupils, mouth, glint]);
    gsap.set(lids, { attr: { height: 0 } });
    gsap.set(pupils, { x: 0, y: 0 });
    gsap.set(mouth, { scaleY: 1 });
    gsap.set(glint, { scale: 0 });
  }

  // ---------- full sequence ----------
  function playSequence() {
    if (idleTween) idleTween.kill();
    stopFlap();
    stopFaceIdle();
    resetFace();
    gsap.killTweensOf(wrap);
    gsap.killTweensOf([wingL, wingR]);

    gsap.set(wrap, { opacity: 0, scale: 0.55, rotate: -18, x: -520, y: -260 });
    gsap.set([wingL, wingR], { rotate: 0 });

    const tl = gsap.timeline();

    // Enter: swoop in along a curve, fast flap the whole way
    tl.call(function () { flapWings(true); })
      .to(wrap, {
        opacity: 1,
        motionPath: { path: [{ x: -520, y: -260 }, { x: -180, y: -90 }, { x: 0, y: 0 }], curviness: 1.6 },
        duration: 1.15,
        ease: "power1.in"
      }, 0);

    // Brake: stop the flap cleanly, then flare
    tl.call(stopFlap, null, 1.15)
      .to(wrap,  { rotate: 8,   duration: 0.55, ease: "power2.out" }, 1.15)
      .to(wingL, { rotate: -45, duration: 0.55, ease: "power2.out" }, 1.15)
      .to(wingR, { rotate: 45,  duration: 0.55, ease: "power2.out" }, 1.15);

    // Land: squash, overshoot, settle
    tl.to(wrap, { scaleX: 0.9, scaleY: 1.1, rotate: 0, duration: 0.14, ease: "power1.out" }, 1.7)
      .to(wrap, { scaleX: 1.05, scaleY: 0.97, duration: 0.14, ease: "power1.inOut" }, 1.86)
      .to(wrap, { scaleX: 1, scaleY: 1, duration: 0.1, ease: "power1.out" }, 2.02)
      .to([wingL, wingR], { rotate: 0, duration: 0.25, ease: "power2.out" }, 1.86);

    // Face on landing: narrow the eyes, flash the fangs, then open back up
    if (lids.length) {
      tl.add(lidsTo(9, 0.12), 1.72)
        .call(fangFlash, null, 1.9)
        .add(lidsTo(0, 0.25), 2.45);
    }

    // Idle: slow flap, gentle hover, blinks / glances / fang glints
    tl.call(function () {
      flapWings(false);
      idleTween = gsap.to(wrap, { y: "-=4", duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
      startFaceIdle();
    });
  }

  Promise.all([svgReady, pageLoaded]).then(function () {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(wrap, { opacity: 1 });       // landed pose, no motion
      return;
    }
    setupCursorFollow();
    // If the hero intro script is on the page it decides when the bat flies in
    // (it calls window.playBat). Otherwise the bat plays straight away.
    window.playBat = playSequence;
    if (!window.HERO_INTRO || window.batPending) playSequence();
  });
})();


/* GHOST — works for every ghost on the page (hero, footer, ...).
   Each one: <div class="ghost_scene"><div class="ghost_wrap" data-svg="...ghost-anim.svg"></div></div> */
(function () {
  const scenes = document.querySelectorAll(".ghost_scene");
  if (!scenes.length || typeof gsap === "undefined") return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  scenes.forEach(function (scene, n) {
    const slot = scene.querySelector("[data-svg]");
    if (!slot) return;

    // Load the SVG inline so the script can reach the tail wave and pupils.
    // If loading fails, fall back to a plain image (static, fully visible).
    fetch(slot.dataset.svg)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (txt) {
        // Give this copy its own IDs, so two ghosts on one page don't share a filter/clip
        txt = txt.replace(/id="([^"]+)"/g, 'id="$1-g' + n + '"').replace(/url\(#([^)]+)\)/g, "url(#$1-g" + n + ")");
        slot.innerHTML = txt;
        const svg = slot.querySelector("svg");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        init(scene);
      })
      .catch(function (err) {
        console.warn("Ghost SVG could not be loaded inline:", err);
        slot.innerHTML = '<img src="' + slot.dataset.svg + '" alt="">';
      });
  });

  function init(scene) {
    const wrap   = scene.querySelector(".ghost_wrap");
    const tail   = scene.querySelector(".ghost_tail-wave");     // feDisplacementMap
    const pupils = scene.querySelectorAll(".ghost_pupil");
    const looks  = scene.querySelectorAll(".ghost_look");

    if (reduce) { gsap.set(wrap, { opacity: 1 }); return; }     // resting frame: fully visible, no motion

    // Eyes follow the cursor when it comes near (adds on top of the stopwatch glance)
    const FOLLOW_RADIUS = 450;          // px from the ghost's eyes where it starts watching
    const MAX_X = 4, MAX_Y = 3.5;       // how far the pupils can move (SVG units)
    const lookX = gsap.quickTo(looks, "x", { duration: 0.35, ease: "power3.out" });
    const lookY = gsap.quickTo(looks, "y", { duration: 0.35, ease: "power3.out" });
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      const r  = wrap.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width * 0.54);   // between the eyes
      const dy = e.clientY - (r.top  + r.height * 0.22);
      const dist = Math.hypot(dx, dy);
      if (dist > FOLLOW_RADIUS || !dist) { lookX(0); lookY(0); return; }
      const reach = Math.min(dist / 150, 1);
      lookX((dx / dist) * MAX_X * reach);
      lookY((dy / dist) * MAX_Y * reach);
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", function () { lookX(0); lookY(0); });

    // Tail wave: the lower hem sways side to side (2s per sway, 3 per loop, so it stays seamless)
    const tailTween = gsap.fromTo(tail, { attr: { scale: -18 } }, { attr: { scale: 18 }, duration: 1, ease: "sine.inOut", yoyo: true, repeat: -1 });

    // 6s seamless loop, timings from the brief
    const tl = gsap.timeline({ repeat: -1 });
    tl.set(wrap, { opacity: 0.1, y: 0 }, 0)
      .to(wrap, { opacity: 1, duration: 1.5, ease: "sine.inOut" }, 0)                         // 1. fade in
      .to(wrap, { y: -5, duration: 1, ease: "sine.inOut", yoyo: true, repeat: 1 }, 1.5)        // 2. hold + bob
      .to(pupils, { x: 4, y: 5, duration: 0.2, ease: "power2.out" }, 2.0)                     //    glance at the watch
      .to(pupils, { x: 0, y: 0, duration: 0.25, ease: "power2.inOut" }, 2.9)
      .to(wrap, { opacity: 0.1, duration: 1.5, ease: "sine.inOut" }, 3.5)                     // 3. fade out
      .to({}, { duration: 1 }, 5);                                                             // 4. hold faded

    // Only run while this ghost is on screen (saves work for the footer one)
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        const on = entries[0].isIntersecting;
        [tl, tailTween].forEach(function (t) { on ? t.resume() : t.pause(); });
      }).observe(scene);
    }
  }
})();



(function () {
  const scene = document.getElementById("monsterScene");
  if (!scene) return;
  const layer = scene.querySelector(".monster_layer");
  const slots = scene.querySelectorAll("[data-svg]");

  // Load the SVGs inline so the script can move the pupils inside them.
  // If loading fails, fall back to plain images (static pose, no animation).
  Promise.all(Array.from(slots).map(function (slot) {
    return fetch(slot.dataset.svg)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (txt) {
        slot.innerHTML = txt;
        const svg = slot.querySelector("svg");
        svg.removeAttribute("width");
        svg.removeAttribute("height");
      });
  }))
  .then(init)
  .catch(function (err) {
    console.warn("Monster SVGs could not be loaded inline:", err);
    slots.forEach(function (slot) { slot.innerHTML = '<img src="' + slot.dataset.svg + '" alt="">'; });
    layer.classList.add("is-ready");
  });

  function init() {
    gsap.registerPlugin(ScrollTrigger);

    const body   = scene.querySelector(".monster_body");
    const armL   = scene.querySelector(".monster_arm-l");
    const armR   = scene.querySelector(".monster_arm-r");
    const pupils = scene.querySelectorAll(".m-pupil");
    const looks  = scene.querySelectorAll(".m-look");     // wrapper used only for cursor-follow

    // ---------- eyes follow the cursor when it comes near ----------
    const FOLLOW_RADIUS = 450;          // px from the monster's eyes where it starts watching
    const MAX_X = 6, MAX_Y = 5;         // how far the pupils can move (SVG units)
    const lookX = gsap.quickTo(looks, "x", { duration: 0.3, ease: "power3.out" });
    const lookY = gsap.quickTo(looks, "y", { duration: 0.3, ease: "power3.out" });
    let canTrack = false, tracking = false, dartTl = null;

    function stopTracking() {
      if (!tracking) return;
      tracking = false;
      lookX(0); lookY(0);
      if (dartTl) dartTl.resume();
    }
    window.addEventListener("pointermove", function (e) {
      if (!canTrack || e.pointerType === "touch") return;
      const r  = layer.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width * 0.50);   // between the eyes
      const dy = e.clientY - (r.top  + r.height * 0.34);
      const dist = Math.hypot(dx, dy);
      if (dist > FOLLOW_RADIUS) { stopTracking(); return; }
      if (!tracking) { tracking = true; if (dartTl) dartTl.pause(); }
      const reach = Math.min(dist / 150, 1);
      lookX(dist ? (dx / dist) * MAX_X * reach : 0);
      lookY(dist ? (dy / dist) * MAX_Y * reach : 0);
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", stopTracking);

    // Rest angle comes from your CSS (8deg on desktop, whatever you set on mobile)
    const REST_ROT = gsap.getProperty(layer, "rotate") || 0;
    // Desktop: tucked behind the card and pops out. Mobile: waits off the right edge and slides in.
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const HIDDEN = isMobile
      ? { xPercent: 140, yPercent: 0, rotate: REST_ROT + 25 }
      : { xPercent: -76, yPercent: 22, rotate: 2 };
    let idle = [];

    function killIdle() { idle.forEach(function (t) { t.kill(); }); idle = []; }

    function restPose() {
      killIdle();
      gsap.killTweensOf([layer, body, armL, armR, pupils]);
      gsap.set(layer, { xPercent: 0, yPercent: 0, rotate: REST_ROT });
      gsap.set(body, { scaleX: 1, scaleY: 1 });
      gsap.set([armL, armR], { rotate: 0, scale: 1 });
      gsap.set(pupils, { x: 0 });
    }

    function startIdle() {
      // Breathing
      idle.push(gsap.to(body, { scaleY: 1.012, scaleX: 0.995, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 }));
      // Eyes dart every few seconds (paused while it's watching the cursor)
      dartTl = gsap.timeline({ repeat: -1, repeatDelay: 2.6, delay: 0.6, paused: tracking });
      idle.push(dartTl
        .to(pupils, { x: -5, duration: 0.12, ease: "power2.out" })
        .to(pupils, { x: 5,  duration: 0.16, ease: "power2.inOut" }, "+=0.55")
        .to(pupils, { x: 0,  duration: 0.14, ease: "power2.out" }, "+=0.45"));
      canTrack = true;
      // Occasional squeeze
      idle.push(gsap.timeline({ repeat: -1, repeatDelay: 3.4, delay: 2 })
        .to(armL, { rotate: 3,  duration: 0.12, ease: "power2.out" }, 0)
        .to(armR, { rotate: -3, duration: 0.12, ease: "power2.out" }, 0)
        .to([armL, armR], { rotate: 0, duration: 0.3, ease: "back.out(3)" }, 0.14));
    }

    function play() {
      canTrack = false;
      tracking = false;
      dartTl = null;
      lookX(0); lookY(0);
      restPose();
      gsap.set(layer, HIDDEN);
      gsap.set(armL, { rotate: 28 });    // arms hang open while it pops out
      gsap.set(armR, { rotate: -28 });

      const tl = gsap.timeline({ onComplete: startIdle });

      // 1. Hidden: 0–0.3s
      // 2. Pop out: 0.3–0.8s, springs out to the right with a little overshoot
      tl.to(layer, { xPercent: 0, yPercent: 0, rotate: REST_ROT, duration: isMobile ? 0.7 : 0.5, ease: isMobile ? "back.out(1.6)" : "back.out(2.2)" }, 0.3)
        .fromTo(body, { scaleY: 0.92, scaleX: 1.05 }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: "back.out(3)" }, 0.3);

      // 3. Grab: 0.8–1.2s, arms swing in and clamp, slight squeeze
      tl.to(armL, { rotate: -4, duration: 0.22, ease: "power3.in" }, 0.8)
        .to(armR, { rotate: 4,  duration: 0.22, ease: "power3.in" }, 0.8)
        .to(body, { scaleY: 0.97, scaleX: 1.02, duration: 0.1, ease: "power2.out" }, 1.0)
        .to([armL, armR], { scale: 0.97, duration: 0.08, ease: "power2.out" }, 1.02)
        .to([armL, armR], { rotate: 0, scale: 1, duration: 0.2, ease: "back.out(2.5)" }, 1.1)
        .to(body, { scaleY: 1, scaleX: 1, duration: 0.2, ease: "back.out(2)" }, 1.1);

      // 4. Settle: eyes dart once, then the idle loop takes over
      tl.to(pupils, { x: -5, duration: 0.12, ease: "power2.out" }, 1.35)
        .to(pupils, { x: 0,  duration: 0.18, ease: "power2.inOut" }, 1.85);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      restPose();                                  // static resting frame only
      layer.classList.add("is-ready");
      return;
    }

    gsap.set(layer, HIDDEN);                       // start hidden behind the card
    layer.classList.add("is-ready");
    ScrollTrigger.create({ trigger: scene, start: "top 75%", once: true, onEnter: play });
  }
})();


/* SERVER LIGHTS — blinking drive LEDs, flickering status bars, pulsing screens,
   a soft neon hum and the odd spooky power flicker. */
(function () {
  const img = document.querySelector("img.hero_servers");
  if (!img || typeof gsap === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Positions in % of the servers image (img-servers.webp, 900 x 819)
  const LEDS   = [[82.11,8.61],[50.61,10.01],[72.39,10.44],[82.11,11.29],[20.5,11.42],[77.22,11.54],[41.22,11.78],[72.39,11.78],[50.61,12.64],[45.89,12.88],[11.39,13.19],[41.22,13.13],[20.44,14.04],[77.22,14.16],[15.89,14.22],[11.39,14.47],[67.67,14.47],[82.11,15.26],[45.89,15.38],[77.17,15.51],[36.67,15.75],[36.39,15.81],[67.39,15.93],[50.56,16.48],[15.89,16.67],[45.83,16.67],[82.11,16.67],[77.17,16.85],[7.06,16.91],[72.39,17.09],[36.72,17.16],[67.61,17.28],[20.44,17.64],[50.56,17.77],[15.83,17.89],[45.83,18.01],[41.17,18.19],[36.56,18.38],[7.0,18.44],[20.44,18.99],[15.83,19.11],[82.11,19.17],[11.39,19.29],[6.94,19.54],[67.61,19.84],[50.56,20.21],[82.06,20.57],[36.5,20.82],[20.44,21.31],[67.61,21.12],[50.56,21.55],[82.06,21.92],[6.94,21.92],[77.17,22.16],[36.5,22.16],[72.28,22.34],[72.56,22.28],[67.56,22.47],[20.39,22.59],[50.5,22.89],[45.83,23.14],[6.89,23.14],[41.22,23.2],[40.94,23.26],[36.5,23.44],[20.39,23.87],[15.83,24.11],[11.44,24.11],[11.17,24.24],[82.11,24.42],[6.89,24.36],[77.17,24.6],[72.33,24.85],[50.56,25.27],[45.83,25.52],[41.22,25.7],[40.94,25.7],[82.06,25.82],[20.44,26.19],[15.83,26.43],[11.39,26.56],[50.5,26.62],[82.06,27.17],[20.39,27.47],[72.33,27.59],[50.56,27.96],[41.17,28.33],[20.39,28.75],[11.33,29.06],[81.17,29.79],[85.61,29.61],[78.94,29.85],[47.56,30.46],[49.67,30.46],[53.94,30.34],[83.28,31.07],[85.56,31.01],[17.44,31.2],[19.56,31.2],[23.72,31.07],[79.0,31.01],[81.22,31.26],[78.89,31.32],[51.72,31.81],[53.89,31.68],[47.56,31.93],[49.67,31.93],[21.61,32.42],[23.67,32.36],[17.5,32.36],[19.56,32.54],[17.5,32.72],[82.06,34.8],[72.28,35.1],[50.56,35.29],[67.5,35.16],[41.11,35.65],[20.44,35.84],[36.5,35.71],[11.33,36.14],[82.0,36.2],[6.83,36.26],[50.44,36.69],[67.5,36.57],[20.33,37.18],[36.5,37.06],[82.0,37.55],[6.83,37.55],[50.44,38.03],[20.33,38.46],[77.11,40.29],[72.28,40.42],[67.5,40.48],[45.72,40.6],[41.06,40.78],[36.44,40.84],[15.78,40.96],[11.28,41.09],[6.83,41.15],[77.11,41.64],[72.28,41.76],[45.78,41.94],[67.5,41.88],[41.06,42.06],[15.78,42.19],[36.5,42.12],[11.28,42.37],[6.83,42.49],[82.0,42.86],[50.44,43.1],[72.22,43.1],[20.33,43.35],[41.11,43.35],[11.22,43.59],[83.44,45.73],[84.5,45.73],[51.89,45.85],[81.28,45.79],[82.33,45.79],[49.78,45.91],[50.83,45.91],[52.94,45.91],[70.22,45.97],[71.33,45.97],[72.44,45.97],[19.67,46.09],[20.67,46.09],[21.67,46.03],[22.72,46.03],[41.22,46.09],[69.22,46.03],[38.11,46.15],[39.11,46.15],[40.22,46.15],[8.44,46.28],[9.44,46.28],[10.44,46.28],[11.44,46.28],[20.28,50.24],[50.39,50.24],[81.94,50.24],[11.22,50.43],[41.0,50.43],[72.22,50.43],[15.72,51.59],[6.83,51.71],[45.72,51.65],[77.06,51.71],[36.44,51.77],[67.44,51.83],[20.28,52.81],[11.22,52.87],[50.39,52.93],[6.83,52.99],[41.0,52.99],[81.89,53.05],[36.44,53.11],[67.5,53.17],[72.22,53.11],[11.22,54.95],[15.67,54.88],[45.67,55.01],[41.0,55.13],[72.17,55.31],[77.0,55.25],[11.22,56.17],[15.72,56.17],[20.22,56.17],[50.39,56.35],[41.0,56.41],[45.61,56.41],[76.94,56.59],[81.83,56.59],[72.22,56.65],[6.78,57.45],[15.67,57.39],[11.22,57.45],[36.39,57.81],[41.0,57.75],[45.67,57.75],[67.44,58.06],[72.22,58.0],[77.0,58.0],[16.89,60.01],[14.11,60.07],[15.78,60.07],[45.72,60.38],[46.89,60.38],[44.11,60.44],[77.06,60.74],[78.33,60.74],[75.33,60.81],[14.78,61.05],[22.44,61.05],[76.0,61.78],[6.72,63.06],[11.17,63.06],[15.67,63.06],[20.22,63.06],[36.39,63.55],[40.94,63.55],[45.67,63.55],[50.33,63.55],[67.39,64.04],[72.17,64.04],[77.0,64.04],[81.83,64.04],[6.72,64.29],[11.17,64.35],[20.22,64.35],[36.33,64.84],[40.94,64.9],[50.39,64.9],[72.11,65.38],[81.83,65.38],[67.39,65.38],[11.17,65.57],[20.17,65.51],[40.94,66.18],[50.33,66.12],[72.17,66.73],[81.83,66.73],[6.67,67.83],[11.17,67.83],[20.17,67.83],[36.33,68.5],[50.33,68.44],[40.94,68.56],[6.72,69.05],[11.11,69.11],[15.67,69.11],[20.17,69.11],[67.33,69.17],[72.17,69.17],[81.83,69.17],[36.28,69.78],[40.94,69.84],[45.56,69.84],[50.33,69.78],[6.72,70.33],[11.11,70.33],[15.67,70.33],[20.17,70.39],[67.33,70.51],[72.11,70.51],[76.94,70.57],[81.83,70.51],[36.33,71.06],[40.94,71.12],[45.56,71.12],[50.33,71.12],[67.39,71.79],[72.11,71.86],[76.89,71.92],[81.83,71.86],[11.17,72.83],[15.61,72.89],[40.94,73.69],[45.56,73.75],[6.67,74.05],[15.61,74.18],[72.11,74.54],[76.89,74.6],[36.28,74.97],[45.61,75.03],[11.11,75.34],[15.67,75.34],[20.22,75.46],[67.28,75.89],[76.94,75.89],[40.94,76.31],[45.56,76.31],[50.33,76.37],[72.11,77.23],[76.89,77.29],[81.83,77.35],[6.67,78.82],[36.28,79.85],[6.61,80.04],[11.11,80.1],[67.33,80.89],[36.28,81.14],[40.89,81.2],[67.28,82.23],[72.06,82.36]];
  const PANELS = [[12.67, 45.18, 5.78, 2.69],[42.56, 44.93, 6.22, 2.93],[73.78, 44.81, 6.22, 2.93]];
  const BARS   = [[6.44, 30.53, 10.67, 2.2],[36.22, 29.79, 10.67, 2.2],[67.11, 29.06, 11.11, 2.2],[7.33, 59.83, 5.56, 2.2],[37.0, 60.07, 5.56, 2.2],[68.0, 60.44, 5.78, 2.2]];

  // Wrap the image so we can lay the lights over it. The wrapper takes over the
  // image's classes, so its size/position styles and the hero intro still apply.
  const wrap = document.createElement("div");
  wrap.className = img.className + " srv-wrap";
  img.parentNode.insertBefore(wrap, img);
  wrap.appendChild(img);
  img.className = "srv-img";

  const fx = document.createElement("div");
  fx.className = "srv-fx";
  const box = function (cls, p) {
    const d = document.createElement("div");
    d.className = cls;
    d.style.left = p[0] + "%"; d.style.top = p[1] + "%";
    d.style.width = p[2] + "%"; d.style.height = p[3] + "%";
    return d;
  };
  const bars   = BARS.map(function (p) { const d = box("srv-bar", p); fx.appendChild(d); return d; });
  const panels = PANELS.map(function (p) { const d = box("srv-panel", p); fx.appendChild(d); return d; });
  const leds   = LEDS.map(function (p) {
    const s = document.createElement("span");
    s.className = "srv-led";
    s.style.left = p[0] + "%"; s.style.top = p[1] + "%";
    const glow = document.createElement("i");
    s.appendChild(glow);
    fx.appendChild(s);
    return glow;
  });
  const dim = document.createElement("div");
  dim.className = "srv-dim";
  fx.appendChild(dim);
  wrap.appendChild(fx);

  const R = gsap.utils.random;
  const tweens = [];

  // 1. Drive activity: every tick a few random LEDs blink off for a moment
  gsap.set(leds, { opacity: function () { return R(0.55, 1); } });
  let running = true;
  (function tick() {
    if (running) {
      for (let k = 0; k < 12; k++) {
        const led = leds[(Math.random() * leds.length) | 0];
        gsap.fromTo(led, { opacity: 0.05 }, { opacity: R(0.6, 1), duration: R(0.08, 0.3), delay: R(0.04, 0.2), ease: "steps(2)" });
      }
    }
    gsap.delayedCall(R(0.08, 0.16), tick);
  })();

  // 2. Green status bars flicker like data traffic
  bars.forEach(function (b) {
    tweens.push(gsap.to(b, { opacity: function () { return R(0.25, 0.95); }, duration: 0.12, ease: "steps(1)",
      repeat: -1, repeatRefresh: true, repeatDelay: R(0.05, 0.4) }));
  });

  // 3. Screens breathe
  panels.forEach(function (p, i) {
    tweens.push(gsap.to(p, { opacity: 0.85, duration: R(1.4, 2), ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.4 }));
  });

  // 4. Neon hum on the whole rack
  tweens.push(gsap.fromTo(img, { filter: "brightness(1) saturate(1)" },
    { filter: "brightness(1.12) saturate(1.15)", duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 }));

  // 5. Every 6–10s the power stutters (Halloween touch)
  (function flicker() {
    gsap.delayedCall(R(6, 10), function () {
      if (running) {
        gsap.timeline()
          .to(dim, { opacity: 0.55, duration: 0.05, ease: "steps(1)" })
          .to(dim, { opacity: 0.1,  duration: 0.07, ease: "steps(1)" })
          .to(dim, { opacity: 0.7,  duration: 0.05, ease: "steps(1)" })
          .to(dim, { opacity: 0,    duration: 0.25, ease: "power2.out" });
      }
      flicker();
    });
  })();

  // Pause everything while the servers are off-screen
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      running = entries[0].isIntersecting;
      tweens.forEach(function (t) { running ? t.resume() : t.pause(); });
    }).observe(wrap);
  }
})();


/* =========================================================
   SPIDER WEBS
   - Webs spin in thread by thread (from the corners outward) during the hero intro
   - A moonlight glint slides across the threads every few seconds
   - Webs sway gently, and wobble when the cursor sweeps through them
   - A little spider hangs on a thread, bobs, and scurries up if the cursor gets close
   ========================================================= */
(function () {
  const overlay = document.querySelector(".hero-bottom-webs");
  const img = overlay && overlay.querySelector("img");
  if (!overlay || !img || typeof gsap === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.WEBS_FX = true;

  // ---- tuned for img-web.svg (1440 x 818) ----
  // Hub (centre) of each web, in the SVG's own units: the threads grow out from these
  const HUBS = [[243, 707], [1331, 690]];
  // Spider hangs from the long strand of the right-hand web (all values in % of the webs area)
  const SPIDER = { left: 83.5, top: 60.2, drop: 12, size: 2.2 };

  const canvas = overlay.closest(".hero_canvas") || document.body;
  img.style.opacity = "0";                        // hide until the inline version is ready
  if (getComputedStyle(overlay).position === "static") overlay.style.position = "relative";

  let svg, clone, shapes = [], drawMode = false, ready = false;

  // The <img> has already loaded this file without CORS, and the browser may hand that
  // cached copy back to fetch() -> "Failed to fetch". A unique query + no-store forces a
  // fresh CORS request. (The CDN ignores the query string.)
  const src = img.currentSrc || img.src;
  const url = /^https?:/.test(src) ? src + (src.indexOf("?") > -1 ? "&" : "?") + "inline=1" : src;
  fetch(url, { mode: "cors", cache: "no-store" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(setup)
    .catch(function (err) {
      console.warn("Webs SVG could not be loaded inline, using the image fallback:", err);
      fallback();
    });

  // Fallback: keep the <img>, reveal it from the two web centres with a CSS mask,
  // and still run the sway, cursor wobble and spider (no glint, no per-thread spin).
  function fallback() {
    svg = img; clone = null;
    img.style.opacity = "";
    const pts = HUBS.map(function (h) { return (h[0] / 1440 * 100).toFixed(1) + "% " + (h[1] / 818 * 100).toFixed(1) + "%"; });
    const mask = pts.map(function (p) { return "radial-gradient(circle at " + p + ", #000 var(--web-r), transparent calc(var(--web-r) + 10%))"; }).join(",");
    img.style.webkitMaskImage = img.style.maskImage = mask;
    img.style.setProperty("--web-r", "0%");
    buildSpider();
    ready = true;
    window.playWebs = function () {
      const tl = gsap.timeline({ onComplete: startIdle });
      tl.to(img, { "--web-r": "75%", duration: 2, ease: "power2.inOut" })
        .call(function () { img.style.webkitMaskImage = img.style.maskImage = ""; });
      if (spider) tl.fromTo(spider.thread, { scaleY: 0 }, { scaleY: 1, duration: 1.1, ease: "power2.inOut" }, 1.2)
                    .fromTo(spider.body, { y: -spider.dropPx() }, { y: 0, duration: 1.1, ease: "power2.inOut" }, 1.2)
                    .set(spider.wrap, { autoAlpha: 1 }, 1.2);
    };
    if (window.websPending || !window.HERO_INTRO) window.playWebs();
  }

  function setup(txt) {
    // Inline SVG that sizes like the <img> did
    const fit = getComputedStyle(img).objectFit;
    const holder = document.createElement("div");
    holder.innerHTML = txt.trim();
    svg = holder.querySelector("svg");
    svg.setAttribute("class", img.getAttribute("class") || "");
    svg.setAttribute("aria-hidden", "true");
    svg.removeAttribute("width"); svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", fit === "cover" ? "xMidYMid slice" : fit === "fill" ? "none" : "xMidYMid meet");
    svg.style.overflow = "visible";
    img.replaceWith(svg);

    // Glint layer: a copy of the web with a bright band sliding across it
    let html = svg.outerHTML.replace(/id="([^"]+)"/g, 'id="$1-glint"').replace(/url\(#([^)]+)\)/g, "url(#$1-glint)").replace(/href="#([^"]+)"/g, 'href="#$1-glint"');
    holder.innerHTML = html;
    clone = holder.querySelector("svg");
    clone.style.cssText += ";position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;" +
      "filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 6px rgba(220,180,255,.9));" +
      "-webkit-mask-image:linear-gradient(100deg,transparent 42%,#000 50%,transparent 58%);mask-image:linear-gradient(100deg,transparent 42%,#000 50%,transparent 58%);" +
      "-webkit-mask-size:300% 100%;mask-size:300% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;";
    overlay.appendChild(clone);

    // Can the threads be "drawn"? Only if they are strokes (not outlined fills)
    shapes = Array.prototype.slice.call(svg.querySelectorAll("path,line,polyline,polygon,circle,ellipse,rect"));
    const stroked = shapes.filter(function (s) {
      const cs = getComputedStyle(s);
      return cs.stroke && cs.stroke !== "none" && parseFloat(cs.strokeWidth) > 0 && s.getTotalLength;
    });
    drawMode = stroked.length && stroked.length >= shapes.length * 0.6;

    if (drawMode) {
      // Spin order: threads nearest a bottom corner first, spreading outward
      const vb = svg.viewBox.baseVal;
      const W = vb && vb.width ? vb.width : svg.getBBox().width, H = vb && vb.height ? vb.height : svg.getBBox().height;
      shapes = stroked.map(function (s) {
        const b = s.getBBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        const d = Math.min(Math.hypot(cx, H - cy), Math.hypot(W - cx, H - cy));
        const len = s.getTotalLength();
        s.style.strokeDasharray = len + " " + len;
        s.style.strokeDashoffset = len;
        return { el: s, d: d, len: len };
      }).sort(function (a, b) { return a.d - b.d; });
    } else {
      // Outlined artwork (threads are filled shapes): each piece grows out from its web's hub
      shapes = shapes.map(function (s) {
        const b = s.getBBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        let hub = HUBS[0], best = Infinity;
        HUBS.forEach(function (h) { const d = Math.hypot(cx - h[0], cy - h[1]); if (d < best) { best = d; hub = h; } });
        return { el: s, d: best, hub: hub };
      }).sort(function (a, b) { return a.d - b.d; });
      shapes.forEach(function (s) { gsap.set(s.el, { svgOrigin: s.hub[0] + " " + s.hub[1], scale: 0, rotate: -12, opacity: 0 }); });
    }
    img.style.opacity = "";
    buildSpider();
    ready = true;
    window.playWebs = playWebs;
    if (window.websPending || !window.HERO_INTRO) playWebs();
  }

  function playWebs() {
    if (!ready) { window.websPending = true; return; }
    const tl = gsap.timeline({ onComplete: startIdle });
    if (drawMode) {
      shapes.forEach(function (s, i) {
        tl.to(s.el, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, (i / shapes.length) * 1.6);
      });
      tl.call(function () { shapes.forEach(function (s) { s.el.style.strokeDasharray = ""; s.el.style.strokeDashoffset = ""; }); });
    } else {
      shapes.forEach(function (s, i) {
        tl.to(s.el, { scale: 1, rotate: 0, opacity: 1, duration: 1.1, ease: "power3.out" }, (i / shapes.length) * 1.4);
      });
    }
    if (spider) tl.fromTo(spider.thread, { scaleY: 0 }, { scaleY: 1, duration: 1.1, ease: "power2.inOut" }, 1.4)
                  .fromTo(spider.body, { y: -spider.dropPx() }, { y: 0, duration: 1.1, ease: "power2.inOut" }, 1.4)
                  .set(spider.wrap, { autoAlpha: 1 }, 1.4);
  }

  // ---------- idle ----------
  function startIdle() {
    // Gentle breeze
    gsap.to(svg, { skewX: 0.6, transformOrigin: "50% 100%", duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 });
    if (clone) gsap.to(clone, { skewX: 0.6, transformOrigin: "50% 100%", duration: 3.2, ease: "sine.inOut", yoyo: true, repeat: -1 });

    // Moonlight glint every 5–8s
    if (clone) (function glint() {
      gsap.timeline({ delay: gsap.utils.random(5, 8), onComplete: glint })
        .set(clone, { opacity: 0.9, webkitMaskPosition: "100% 0", maskPosition: "100% 0" })
        .to(clone, { webkitMaskPosition: "0% 0", maskPosition: "0% 0", duration: 2.2, ease: "sine.inOut" })
        .set(clone, { opacity: 0 });
    })();

    if (spider) spider.idle();
    watchCursor();
  }

  // ---------- cursor: webs wobble when swept through, spider flees ----------
  function watchCursor() {
    let lastX = 0, lastT = 0, busy = false;
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      const r = overlay.getBoundingClientRect();
      const inside = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
      const now = performance.now();
      const speed = Math.abs(e.clientX - lastX) / Math.max(now - lastT, 1);
      lastX = e.clientX; lastT = now;
      if (inside && speed > 0.8 && !busy) {                       // quick sweep through the web
        busy = true;
        const dir = e.movementX > 0 ? 1 : -1;
        gsap.timeline({ onComplete: function () { busy = false; } })
          .to([svg, clone].filter(Boolean), { x: dir * 3, duration: 0.12, ease: "power2.out" })
          .to([svg, clone].filter(Boolean), { x: 0, duration: 1.2, ease: "elastic.out(1, 0.25)" });
      }
      if (spider) spider.react(e);
    }, { passive: true });
  }

  // ---------- the spider ----------
  let spider = null;
  function buildSpider() {
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;left:" + (SPIDER.left - SPIDER.size / 2) + "%;top:" + SPIDER.top + "%;width:" + SPIDER.size + "%;pointer-events:none;visibility:hidden;z-index:2;";
    const thread = document.createElement("div");
    thread.style.cssText = "position:absolute;left:50%;top:0;width:1px;margin-left:-0.5px;background:rgba(255,255,255,.75);transform-origin:50% 0;";
    const body = document.createElement("div");
    body.style.cssText = "position:absolute;left:0;width:100%;";
    body.innerHTML =
      '<svg viewBox="0 0 40 40" style="display:block;width:100%;height:auto;overflow:visible">' +
      '<g stroke="#1b1025" stroke-width="2.2" stroke-linecap="round" fill="none" class="legs">' +
      '<path d="M16 17 Q8 10 3 14"/><path d="M16 20 Q7 17 2 22"/><path d="M16 23 Q8 25 4 31"/><path d="M17 25 Q12 31 9 37"/>' +
      '<path d="M24 17 Q32 10 37 14"/><path d="M24 20 Q33 17 38 22"/><path d="M24 23 Q32 25 36 31"/><path d="M23 25 Q28 31 31 37"/></g>' +
      '<ellipse cx="20" cy="15" rx="5" ry="4.5" fill="#241533" stroke="#8a4dff" stroke-width=".8"/>' +
      '<ellipse cx="20" cy="24" rx="7" ry="8" fill="#241533" stroke="#8a4dff" stroke-width=".8"/>' +
      '<circle cx="18.2" cy="14.5" r="1.1" fill="#ff9d2e"/><circle cx="21.8" cy="14.5" r="1.1" fill="#ff9d2e"/></svg>';
    wrap.appendChild(thread); wrap.appendChild(body);
    overlay.appendChild(wrap);

    const dropPx = function () { return overlay.getBoundingClientRect().height * SPIDER.drop / 100; };
    const place = function () {
      const d = dropPx();
      thread.style.height = d + "px";
      body.style.top = (d - 2) + "px";
    };
    place();
    window.addEventListener("resize", place);

    let bob = null, fleeing = false;
    spider = {
      wrap: wrap, thread: thread, body: body, dropPx: dropPx,
      idle: function () {
        bob = gsap.to([body, thread], { y: function (i) { return i === 0 ? 6 : 0; }, scaleY: function (i) { return i === 1 ? 1.03 : 1; },
          duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(body.querySelector(".legs"), { rotate: 4, svgOrigin: "20 20", duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: -1, repeatDelay: 1.2 });
      },
      react: function (e) {
        if (fleeing || !bob) return;
        const r = body.getBoundingClientRect();
        if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > 140) return;
        fleeing = true;                                  // scurry up the thread, then come back down
        bob.pause();
        const d = dropPx();
        gsap.timeline({ onComplete: function () { fleeing = false; bob.resume(); } })
          .to(body,   { y: -d + 4, duration: 0.45, ease: "power3.out" }, 0)
          .to(thread, { scaleY: 0.05, duration: 0.45, ease: "power3.out" }, 0)
          .to(body,   { y: 0, duration: 1.6, ease: "power2.inOut" }, 2.2)
          .to(thread, { scaleY: 1, duration: 1.6, ease: "power2.inOut" }, 2.2);
      }
    };
  }
})();


/* =========================================================
   HERO INTRO + PARALLAX
   Order: canvas box grows open -> nav -> moon, webs, servers
   -> title letters -> green monsters scurry in from the left and right -> logo, copy, button
   -> mouse parallax switches on.
   ========================================================= */
(function () {
  const root = document.documentElement;
  const $  = function (s) { return document.querySelector(s); };
  const $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  const canvas = $(".hero_canvas");
  if (!canvas || typeof gsap === "undefined") { root.classList.remove("hero-intro"); return; }
  if (window.SplitText) gsap.registerPlugin(SplitText);

  const el = {
    brand:    $(".nav-wrap .brand-link"),
    links:    $$(".nav-wrap .nav-link"),
    navRight: $(".nav-wrap .nav-right"),
    moon:     $(".hero_canvas .red-moon"),
    servers:  $(".hero_canvas .hero_servers"),
    webs:     $(".hero_canvas .hero-bottom-webs"),
    title:    $(".hero_canvas .hero-header h1"),
    monster:  $(".hero_canvas .hero_monster"),       // optional: only if the hero has a monster image
    monsterL: $(".hero_canvas .green-monster-left"),
    monsterR: $(".hero_canvas .green-monster-right"),
    logo:     $(".hero_canvas .hpe-logo"),
    sub:      $(".hero_canvas .hero-subheader-wrap"),
    bottom:   $(".hero_canvas .hero-header-bottom"),
    btn:      $(".hero_canvas .hero-btn")
  };
  const has = function (x) { return x && (!Array.isArray(x) || x.length); };

  // Reduced motion: show the finished hero, no intro, no parallax
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.remove("hero-intro");
    return;
  }

  const RADIUS = "24px";   // match the hero canvas corner radius
  const clip = function (v, h) { return "inset(" + v + "% " + h + "% " + v + "% " + h + "% round " + RADIUS + ")"; };

  function build() {
    // Split the title into letters (words kept together so lines don't break mid-word)
    let chars = [];
    if (has(el.title) && window.SplitText) {
      const split = new SplitText(el.title, { type: "words,chars", wordsClass: "hero-word", charsClass: "hero-char" });
      chars = split.chars;
    }

    // ---------- start states (everything hidden) ----------
    canvas.style.clipPath = clip(50, 50);
    if (has(el.brand))    gsap.set(el.brand,    { autoAlpha: 0, y: -24 });
    if (has(el.links))    gsap.set(el.links,    { autoAlpha: 0, y: -16 });
    if (has(el.navRight)) gsap.set(el.navRight, { autoAlpha: 0, scale: 0.85 });
    if (has(el.moon))     gsap.set(el.moon,     { autoAlpha: 0, scale: 0.4, rotate: -25 });
    if (has(el.webs))     gsap.set(el.webs,     { autoAlpha: 0 });
    if (has(el.servers))  gsap.set(el.servers,  { autoAlpha: 0, yPercent: 35 });
    if (has(el.title))    gsap.set(el.title,    { autoAlpha: 1 });
    if (chars.length)     gsap.set(chars,       { autoAlpha: 0, yPercent: 60, scale: 0.5 });
    if (has(el.monster))  gsap.set(el.monster,  { autoAlpha: 0, scale: 0, rotate: -20, transformOrigin: "50% 100%" });
    // Green monsters wait just outside the canvas: left one off the left edge, right one above the top
    const offLeft = function (m) { return canvas.getBoundingClientRect().left - m.getBoundingClientRect().right - 40; };
    const offTop  = function (m) { return canvas.getBoundingClientRect().top - m.getBoundingClientRect().bottom - 40; };
    if (has(el.monsterL)) gsap.set(el.monsterL, { autoAlpha: 0, x: offLeft(el.monsterL), transformOrigin: "50% 100%" });
    if (has(el.monsterR)) gsap.set(el.monsterR, { autoAlpha: 0, y: offTop(el.monsterR),  transformOrigin: "50% 100%" });
    if (has(el.logo))     gsap.set(el.logo,     { autoAlpha: 0, x: -30 });
    const subLines = has(el.sub) ? (el.sub.children.length ? Array.prototype.slice.call(el.sub.children) : [el.sub]) : [];
    if (has(el.sub))      gsap.set(el.sub,      { autoAlpha: 1 });
    if (subLines.length)  gsap.set(subLines,    { autoAlpha: 0, y: 20 });
    if (has(el.btn))      gsap.set(el.btn,      { autoAlpha: 0, scale: 0.8 });

    root.classList.remove("hero-intro");   // GSAP owns visibility from here

    // ---------- the sequence ----------
    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: function () {
      canvas.style.clipPath = "";      // monsters are in, nothing left to hide outside the canvas
      enableParallax();
    } });

    // 1. Canvas grows from nothing at the centre out to full size in all four directions.
    //    (tweening plain numbers and writing the clip-path ourselves keeps all 4 sides in sync)
    const box = { v: 50, h: 50 };
    const drawBox = function () { canvas.style.clipPath = clip(box.v, box.h); };
    tl.to(box, { v: 0, h: 0, duration: 1.4, ease: "power4.inOut", onUpdate: drawBox }, 0.1);

    // 2. Nav drops in as the canvas finishes opening
    const t = 1.1;
    if (has(el.brand))    tl.to(el.brand,    { autoAlpha: 1, y: 0, duration: 0.7 }, t);
    if (has(el.links))    tl.to(el.links,    { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07 }, t + 0.1);
    if (has(el.navRight)) tl.to(el.navRight, { autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(2)" }, t + 0.35);

    // 3. Scene: moon rises, webs settle, servers slide up
    if (has(el.moon))    tl.to(el.moon,    { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.4, ease: "expo.out" }, 0.85);
    // Webs: the webs script spins them in thread by thread (window.playWebs).
    // Without that script they just fade in.
    if (has(el.webs)) {
      tl.call(function () {
        if (window.WEBS_FX) { gsap.set(el.webs, { autoAlpha: 1 }); if (window.playWebs) window.playWebs(); else window.websPending = true; }
        else gsap.to(el.webs, { autoAlpha: 1, duration: 1.6, ease: "power2.out" });
      }, null, 1);
    }
    if (has(el.servers)) tl.to(el.servers, { autoAlpha: 1, yPercent: 0, duration: 1.1 }, 1.2);

    // 4. Title letters (same feel as the Webflow interaction: from 0 opacity, down, half scale, elastic)
    if (chars.length) tl.to(chars, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 1.5, ease: "elastic.out(1, 0.55)", stagger: 0.04 }, 1.4);

    // 5. Characters
    if (has(el.monster)) tl.to(el.monster, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.7, ease: "back.out(2.2)" }, 2.15);
    if (has(el.monsterL)) monsterIn(tl, el.monsterL, -1, 2.1);    // left one scurries in...
    if (has(el.monsterR)) monsterDrop(tl, el.monsterR, 2.35);     // ...right one drops from the top a beat later
    if (has(el.monsterL)) tl.call(monsterFloat, [el.monsterL, 2.4, 0],   3.3);   // then both float, out of step
    if (has(el.monsterR)) tl.call(monsterFloat, [el.monsterR, 2.8, 0.6], 3.5);

    // 6. Bottom row: logo, copy lines, button
    if (has(el.logo))    tl.to(el.logo,   { autoAlpha: 1, x: 0, duration: 0.8 }, 2.65);
    if (subLines.length) tl.to(subLines,  { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12 }, 2.75);
    if (has(el.btn))     tl.to(el.btn,    { autoAlpha: 1, scale: 1, duration: 0.8, ease: "back.out(2)" }, 2.95);
  }

  // ---------- green monsters ----------
  // Entrance, then a gentle float. The float uses yPercent/rotate so it stacks with
  // the mouse parallax (x/y) instead of fighting it.
  // dir: -1 = comes in from the left, 1 = from the right
  function monsterIn(tl, m, dir, at) {
    tl.set(m, { autoAlpha: 1 }, at)
      // scurry in with two hops, leaning forward, then straighten up
      .to(m, { x: 0, duration: 0.9, ease: "power3.out" }, at)
      .to(m, { keyframes: { y: [0, -34, 0, -14, 0], easeEach: "sine.inOut" }, duration: 0.85, ease: "none" }, at)
      .fromTo(m, { rotate: -dir * 14 }, { rotate: 0, duration: 1, ease: "back.out(2)" }, at)
      // land: squash, then spring back
      .to(m, { scaleY: 0.86, scaleX: 1.1, duration: 0.12, ease: "power2.out" }, at + 0.82)
      .to(m, { scaleY: 1, scaleX: 1, duration: 0.7, ease: "elastic.out(1, 0.4)" }, at + 0.94);
  }

  // Drops in from above the canvas, lands hard with a squash and a small bounce
  function monsterDrop(tl, m, at) {
    tl.set(m, { autoAlpha: 1 }, at)
      .to(m, { y: 0, duration: 0.6, ease: "power2.in" }, at)
      .fromTo(m, { rotate: -8 }, { rotate: 0, duration: 0.6, ease: "power1.in" }, at)
      // land: big squash, then spring back with a little hop
      .to(m, { scaleY: 0.8, scaleX: 1.14, duration: 0.1, ease: "power2.out" }, at + 0.6)
      .to(m, { scaleY: 1, scaleX: 1, duration: 0.8, ease: "elastic.out(1, 0.35)" }, at + 0.7)
      .to(m, { y: -18, duration: 0.18, ease: "power2.out" }, at + 0.7)
      .to(m, { y: 0, duration: 0.22, ease: "power2.in" }, at + 0.88);
  }

  function monsterFloat(m, dur, delay) {
    gsap.to(m, { yPercent: -4, duration: dur, ease: "sine.inOut", yoyo: true, repeat: -1, delay: delay });
    gsap.fromTo(m, { rotate: -1.5 }, { rotate: 1.5, duration: dur * 1.3, ease: "sine.inOut", yoyo: true, repeat: -1, delay: delay });
  }

  // ---------- mouse parallax ----------
  // depth = how many px the layer moves at the edge of the hero.
  // Negative = moves with the cursor (background), positive = moves away (foreground).
  const LAYERS = [
    [el.webs,    -10],
    [el.moon,     14],
    [el.servers,  22],
    [el.title,     8],
    [el.monster,  24],
    [el.monsterL, 28],
    [el.monsterR, 32],
    [el.bottom,    5]
  ];
  let parallaxOn = false, movers = [];

  function enableParallax() {
    movers = LAYERS.filter(function (l) { return has(l[0]); }).map(function (l) {
      return {
        d: l[1],
        x: gsap.quickTo(l[0], "x", { duration: 0.9, ease: "power3.out" }),
        y: gsap.quickTo(l[0], "y", { duration: 0.9, ease: "power3.out" })
      };
    });
    parallaxOn = true;
  }

  function moveLayers(nx, ny) {
    movers.forEach(function (m) { m.x(-nx * m.d); m.y(-ny * m.d * 0.6); });
  }

  window.addEventListener("pointermove", function (e) {
    if (!parallaxOn || e.pointerType === "touch") return;
    const r = canvas.getBoundingClientRect();
    if (e.clientY > r.bottom || e.clientY < r.top - 120) { moveLayers(0, 0); return; }   // cursor left the hero
    const nx = gsap.utils.clamp(-1, 1, ((e.clientX - r.left) / r.width  - 0.5) * 2);
    const ny = gsap.utils.clamp(-1, 1, ((e.clientY - r.top)  / r.height - 0.5) * 2);
    moveLayers(nx, ny);
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", function () { if (parallaxOn) moveLayers(0, 0); });

  // Wait for the web fonts so the title splits at the right letter widths
  const go = function () { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();


/* =========================================================
   HERO SCROLL PARALLAX
   As the hero scrolls away, each layer moves at its own speed
   (far things lag behind, near things rush up), and it all
   reverses when you scroll back up.
   Uses the CSS `translate` property, so it never fights the
   mouse parallax (x/y) or the intro animations (yPercent/scale).
   Put this at the END of the file (after the servers/webs scripts).
   ========================================================= */
(function () {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.warn("Hero scroll parallax: GSAP or ScrollTrigger isn't loaded before this file.");
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  const hero   = document.querySelector(".hero_section") || document.querySelector(".hero-section");
  const canvas = document.querySelector(".hero_canvas");
  if (!hero || !canvas) return;
  const q = function (s) { return canvas.querySelector(s); };

  // [element, how far it travels as the hero scrolls out, in % of the hero height]
  // negative = moves up faster than the page (feels close), positive = lags behind (feels far)
  const LAYERS = [
    [q(".red-moon"),             6],
    [q(".hero_servers"),         3],
    [q(".hero-bottom-webs"),    -2],
    [q(".hero-header h1"),      -5],
    [q(".hero_monster"),        -9],
    [q(".hero-header-bottom"),  -3]
  ].filter(function (l) { return l[0]; });

  const mm = gsap.matchMedia();
  mm.add({
    desktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
    mobile:  "(max-width: 767px) and (prefers-reduced-motion: no-preference)"
  }, function (ctx) {
    const k = ctx.conditions.desktop ? 1 : 0.4;          // even less movement on phones
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hero,
        start: "top top",          // starts as soon as you scroll
        end: "bottom top",         // done when the hero has left the screen
        scrub: 1,                  // a touch more lag = softer, smoother follow (works with Lenis)
        invalidateOnRefresh: true  // recalculates on resize
      }
    });

    LAYERS.forEach(function (l) {
      const el = l[0], pct = l[1] * k;
      tl.fromTo(el, { translate: "0px 0px" },
        { translate: function () { return "0px " + (hero.offsetHeight * pct / 100) + "px"; } }, 0);
    });

    // Title fades a little as it leaves; the whole canvas eases back
    const title = q(".hero-header h1");
    if (title) tl.fromTo(title, { opacity: 1 }, { opacity: 0.75 }, 0);
    tl.fromTo(canvas, { scale: 1 }, { scale: 0.98, transformOrigin: "50% 0%" }, 0);

    return function () { gsap.set(LAYERS.map(function (l) { return l[0]; }).concat(canvas), { clearProps: "translate,scale" }); };
  });
})();

/* =========================================================
   SECTION REVEALS
   Add these classes (or attributes) in Webflow:
     has-label-anim    -> fades up
     has-heading-anim  -> letters pop in, same effect as the hero title
     has-text-anim     -> fades up
   Each section plays once when it scrolls into view, in reading order:
     label -> heading (starts before the label finishes) -> text (starts mid-heading)
   Elements inside the hero are skipped (the hero intro animates those).
   ========================================================= */
(function () {
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const SEL = {
    label:   ".has-label-anim, [has-label-anim]",
    heading: ".has-heading-anim, [has-heading-anim]",
    text:    ".has-text-anim, [has-text-anim]"
  };
  const FADE_FROM = { autoAlpha: 0, y: 24 };
  const find = function (sel) {
    return Array.prototype.filter.call(document.querySelectorAll(sel), function (el) { return !el.closest(".hero_canvas"); });
  };
  const all = find(SEL.label + "," + SEL.heading + "," + SEL.text);
  if (!all.length) return;

  // Hide straight away so nothing flashes before its section plays
  gsap.set(all, { autoAlpha: 0 });

  // Group by section (or by parent when an element isn't inside a <section>)
  const groups = new Map();
  all.forEach(function (el) {
    const section = el.closest("section, [data-anim-section]") || el.parentElement;
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(el);
  });

  function build() {
    groups.forEach(function (els, section) {
      const pick = function (sel) { return els.filter(function (el) { return el.matches(sel); }); };
      const labels = pick(SEL.label), headings = pick(SEL.heading), texts = pick(SEL.text);

      const tl = gsap.timeline({
        paused: true,
        scrollTrigger: { trigger: section, start: "top 75%", once: true }
      });
      let t = 0;

      // 1. Label
      if (labels.length) {
        tl.fromTo(labels, FADE_FROM, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.1 }, t);
        t += 0.2;
      }

      // 2. Heading: letters pop in (hero title effect); plain fade up if SplitText isn't on the page
      if (headings.length) {
        if (window.SplitText) {
          headings.forEach(function (h, i) {
            const chars = new SplitText(h, { type: "words,chars", wordsClass: "reveal-word", charsClass: "reveal-char" }).chars;
            gsap.set(h, { autoAlpha: 1 });
            gsap.set(chars, { autoAlpha: 0, yPercent: 60, scale: 0.5 });
            tl.to(chars, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 1.5, ease: "elastic.out(1, 0.55)",
              stagger: { amount: Math.min(chars.length * 0.04, 0.9) } }, t + i * 0.15);   // long headings don't drag on
          });
        } else {
          tl.fromTo(headings, FADE_FROM, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.15 }, t);
        }
        t += 0.5;
      }

      // 3. Paragraph(s)
      if (texts.length) {
        tl.fromTo(texts, FADE_FROM, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.12 }, t);
      }
    });
    ScrollTrigger.refresh();
  }

  // Wait for the web fonts so headings split at the right letter widths
  const go = function () { (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();
