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
  flagTransition: true
});
