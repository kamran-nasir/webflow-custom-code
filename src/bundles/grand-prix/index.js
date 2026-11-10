// "grand-prix" master animations. ONE bundle shared by every client page built from the Grand Prix master
// (CPP is the first client; later clients are duplicates with new colours/copy, same classes, same JS).
// Source of truth: animations/masters/grand-prix/. `scripts/anim.sh build grand-prix` syncs it into webflow-custom-code and bundles it.
import { init } from "../../lib/index.js";

init({
  name: "grand-prix",

  smoothScroll: true,

  // Page-load sequence: nav drops in, video thumbnail rises, headline letters pop, copy + CTA follow.
  heroIntro: {
    brand:    ".cpp-logo-link",
    links:    ".cpp-nav-link",
    navRight: ".cpp-pill",
    media:    ".cpp-hero-video",
    title:    ".cpp-h1",
    logo:     ".cpp-hpe",
    sub:      ".cpp-hero-sub",
    button:   ".cpp-cta"
  },

  // Everything below the hero reveals as its section scrolls into view.
  reveals: {
    label:   ".cpp-tag",
    heading: ".cpp-h2",
    text:    ".cpp-intro-p, .cpp-slow-intro, .cpp-values-sub, .cpp-steps-sub, .cpp-faq-intro, .cpp-cta-p",
    exclude: ".cpp-hero, .cpp-nav"
  },

  // Gentle depth as sections scroll (% of the section height).
  scrollParallax: {
    items: [
      [".cpp-intro-img", -4],
      [".cpp-roads", 6]
    ]
  },

  // Hero video thumbnail drifts a touch against the cursor.
  mouseParallax: { container: ".cpp-hero-grid", layers: [[".cpp-hero-video", 12]] },

  // Checkered-flag scroll transition between "What's slowing" and "Why choose" (empty div[data-flag-transition] in the master).
  // Black rule beside the intro copy: draws down as you scroll (scrubbed)
  scrollLine: { items: ".cpp-intro-text" },

  finishLine: true,
  sprintLines: {
    items: ".cpp-roads",
    svg: { width: 3200, height: 668, stripes: [
      { color: "var(--brand--teal-700, #29615A)", points: [[2743.9, 0], [2829.5, 0], [313.7, 668], [106.2, 668]] },
      { color: "var(--neutral--gray-400, #969696)", points: [[2856.4, 0], [2930.1, 0], [555.3, 668], [370.8, 668]] },
      { color: "var(--brand--green-500, #01A982)", points: [[2955, 0], [3020.7, 0], [773.9, 668], [607.5, 668]] },
      { color: "var(--neutral--gray-350, #C8C8C8)", points: [[3043.7, 0], [3103.4, 0], [971.4, 668], [821, 668]] },
      { color: "var(--brand--mint-400, #6ED2B4)", points: [[3124.3, 0], [3181.1, 0], [1152.9, 668], [1014.5, 668]] }
    ] }
  }
});
