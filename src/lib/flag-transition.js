import { hasGsap, prefersReducedMotion, toArray } from "./core.js";

/* CHECKERED-FLAG TRANSITION (scroll-linked, no video needed)
   Add an empty div with the attribute data-flag-transition between two sections.
   JS builds a band of black/white squares: as the band scrolls into view the squares
   "wave" open one after another, the whole pattern races sideways with your scroll,
   then the squares close again as it leaves. Attributes on the div (all optional):
     data-flag-rows="2"        rows of squares
     data-flag-cols="24"       squares across the page width (even number)
     data-flag-dark="#0E0E0E"  data-flag-light="#FFFFFF"
   Reduced motion: a static band is shown instead. */
export function flagTransition() {
  const bands = toArray("[data-flag-transition]");
  if (!bands.length) return;
  const reduced = prefersReducedMotion();
  const canAnimate = hasGsap(true) && !reduced;
  const gsap = window.gsap;

  bands.forEach(function (band) {
    const rows = parseInt(band.getAttribute("data-flag-rows"), 10) || 2;
    let cols = parseInt(band.getAttribute("data-flag-cols"), 10) || 24;
    if (cols % 2) cols += 1;                              // even keeps the pattern seamless
    const dark  = band.getAttribute("data-flag-dark")  || "#0E0E0E";
    const light = band.getAttribute("data-flag-light") || "#FFFFFF";

    band.setAttribute("aria-hidden", "true");
    band.style.position = "relative";
    band.style.overflow = "hidden";
    band.style.width = "100%";

    let track, squares;
    function draw() {
      const size = Math.max(16, Math.round(band.clientWidth / cols));
      band.style.height = size * rows + "px";
      band.innerHTML = "";
      track = document.createElement("div");
      track.style.cssText = "position:absolute;left:0;top:0;display:grid;width:" + size * cols * 2 + "px;" +
        "grid-template-columns:repeat(" + cols * 2 + "," + size + "px);grid-auto-rows:" + size + "px;";
      squares = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols * 2; c++) {
          const sq = document.createElement("i");
          sq.style.cssText = "display:block;width:" + size + "px;height:" + size + "px;background:" + ((r + c) % 2 ? light : dark) + ";";
          track.appendChild(sq);
          squares.push(sq);
        }
      }
      band.appendChild(track);
    }
    draw();
    if (!canAnimate) return;

    let tl;
    function animate() {
      if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); }
      const size = parseFloat(band.style.height) / rows;
      // Only the first `cols` columns are visible; the other half lets the pattern slide.
      const wave = { each: 0.5 / cols, from: "start" };
      tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: band, start: "top 95%", end: "bottom 5%", scrub: 1, invalidateOnRefresh: true }
      });
      gsap.set(squares, { scaleY: 0, transformOrigin: "50% 50%" });
      tl.to(squares, { scaleY: 1, duration: 0.4, stagger: wave }, 0)                       // wave opens
        .to(track, { x: -size * cols, duration: 1 }, 0)                                    // pattern races past
        .to(squares, { scaleY: 0, duration: 0.4, stagger: { each: 0.5 / cols, from: "end" } }, 0.6);   // wave closes
    }
    animate();

    let w = band.clientWidth;
    window.addEventListener("resize", function () {
      if (band.clientWidth === w) return;
      w = band.clientWidth; draw(); animate();
    });
  });
}
