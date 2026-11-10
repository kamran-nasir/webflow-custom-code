import { marker, registerPlugins, releaseHide, setGate } from "./core.js";
import { curtain } from "./curtain.js";
import { roadLoader } from "./road-loader.js";
import { scrollLine } from "./scroll-line.js";
import { hideHeader } from "./header.js";
import { faq } from "./faq.js";
import { cards } from "./cards.js";
import { smoothScroll } from "./smooth-scroll.js";
import { reveals } from "./reveals.js";
import { scrollParallax, mouseParallax } from "./parallax.js";
import { heroIntro } from "./hero-intro.js";
import { finishLine } from "./finish-line.js";
import { sprintLines } from "./sprint-lines.js";

export { curtain, roadLoader, scrollLine, hideHeader, faq, cards, smoothScroll, reveals, scrollParallax, mouseParallax, heroIntro, finishLine, sprintLines };
export * from "./core.js";

/* One call per campaign. Turn on only what the page uses:

   init({
     name: "CAM-05099",
     smoothScroll: true,                         // or { lerp: 0.08 }
     roadLoader: { colors: [...], background: "var(--neutral--gray-100)" },  // opening animation: stripes bend toward the viewer, then the cover lifts
     hideHeader: { header: ".nav" },                // fixed header hides on scroll down, shows on scroll up
     cards: { fan: { items: ".card" }, stagger: {...}, stairs: {...}, stack: {...} },   // see cards.js
     faq: { items: ".question", icon: ".question-icon" },   // animated <details> accordion
     scrollLine: { items: ".block" },             // a left border that draws down as you scroll (scrubbed)
     curtain: { colors: [...] },                 // opening animation: columns lift away, THEN the rest starts
     reveals: { label: ".x", heading: ".y", text: ".z", exclude: ".hero" },
     heroIntro: { canvas, brand, links, navRight, media, title, logo, sub, button },
     scrollParallax: true,                       // data-parallax="-5" or { items: [[".sel", -4]] }
     mouseParallax: true,                        // [data-mouse-parallax] > [data-depth] or { container, layers }
     finishLine: true,                           // div[data-finish-line]: WebGL checkered finish line
     sprintLines: { items: ".stripes", svg: {...} }, // each racing stripe sprints in on scroll
     custom: function (lib) { ... }              // campaign-only code
   });
*/
export function init(cfg) {
  cfg = cfg || {};
  marker(cfg.name || "campaign");
  registerPlugins();
  if (cfg.smoothScroll) smoothScroll(cfg.smoothScroll === true ? {} : cfg.smoothScroll);
  if (cfg.roadLoader) setGate(roadLoader(cfg.roadLoader === true ? {} : cfg.roadLoader));
  else if (cfg.curtain) setGate(curtain(cfg.curtain === true ? {} : cfg.curtain));   // everything below waits for it
  if (cfg.heroIntro) heroIntro(cfg.heroIntro === true ? {} : cfg.heroIntro);
  if (cfg.reveals) reveals(cfg.reveals === true ? {} : cfg.reveals);
  if (cfg.scrollLine) scrollLine(cfg.scrollLine === true ? {} : cfg.scrollLine);   // left-border rules that draw on scroll
  if (cfg.hideHeader) hideHeader(cfg.hideHeader === true ? {} : cfg.hideHeader);   // fixed header: hides on scroll down, shows on scroll up
  if (cfg.cards) cards(cfg.cards);                    // fan / stagger / stairs / stack card effects
  if (cfg.faq) faq(cfg.faq);                          // animated <details> accordion
  if (cfg.sprintLines) sprintLines(cfg.sprintLines);   // before parallax: it swaps the <img> for an SVG
  if (cfg.scrollParallax) scrollParallax(cfg.scrollParallax === true ? {} : cfg.scrollParallax);
  if (cfg.mouseParallax) mouseParallax(cfg.mouseParallax === true ? {} : cfg.mouseParallax);
  if (cfg.finishLine) finishLine();
  if (typeof cfg.custom === "function") cfg.custom({ gsap: window.gsap, ScrollTrigger: window.ScrollTrigger });
  releaseHide();
}
