import { marker, registerPlugins, releaseHide } from "./core.js";
import { scrollLine } from "./scroll-line.js";
import { textFill } from "./text-fill.js";
import { hideHeader } from "./header.js";
import { faq } from "./faq.js";
import { cards } from "./cards.js";
import { hoverFx } from "./hover-fx.js";
import { decor } from "./decor.js";
import { magnet } from "./magnet.js";
import { videoExpand } from "./video-expand.js";
import { smoothScroll } from "./smooth-scroll.js";
import { reveals } from "./reveals.js";
import { scrollParallax, mouseParallax } from "./parallax.js";
import { heroIntro } from "./hero-intro.js";
import { finishLine } from "./finish-line.js";
import { sprintLines } from "./sprint-lines.js";

export { scrollLine, textFill, hoverFx, decor, magnet, videoExpand, hideHeader, faq, cards, smoothScroll, reveals, scrollParallax, mouseParallax, heroIntro, finishLine, sprintLines };
export * from "./core.js";

/* One call per campaign. Turn on only what the page uses:

   init({
     name: "CAM-05099",
     smoothScroll: true,                         // or { lerp: 0.08 }
     hideHeader: { header: ".nav" },                // fixed header hides on scroll down, shows on scroll up
     cards: { fan: { items: ".card" }, stagger: {...}, stairs: {...}, stack: {...} },   // see cards.js
     faq: { items: ".question", icon: ".question-icon" },   // animated <details> accordion
     magnet: { items: ".play", strength: 0.35 },    // see magnet.js
     videoExpand: { grid: ".grid", left: ".left", video: ".video", play: ".play" },   // see video-expand.js
     decor: { icons: [{ target: ".x", svg: "<svg/>" }], pattern: { items: [{ target: ".p", cells: [[0,0]] }] } },   // see decor.js
     hoverFx: { underline: { items: ".link" }, buttons: { items: ".btn", label: ".btn-label", icon: ".btn-icon" } },   // see hover-fx.js
     scrollLine: { items: ".block" },             // a left border that draws down as you scroll (scrubbed)
     textFill: { items: ".block p", trigger: ".block" },   // words fill 50% -> 100% on scroll, in sync with the scrollLine
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
  if (cfg.heroIntro) heroIntro(cfg.heroIntro === true ? {} : cfg.heroIntro);
  if (cfg.reveals) reveals(cfg.reveals === true ? {} : cfg.reveals);
  if (cfg.scrollLine) [].concat(cfg.scrollLine === true ? {} : cfg.scrollLine).forEach(scrollLine);   // left-border rules that draw on scroll (one config, or an array of configs)
  if (cfg.textFill) [].concat(cfg.textFill === true ? {} : cfg.textFill).forEach(textFill);            // words fill in on scroll (sync it with a scrollLine)
  if (cfg.hideHeader) hideHeader(cfg.hideHeader === true ? {} : cfg.hideHeader);   // fixed header: hides on scroll down, shows on scroll up
  if (cfg.cards) [].concat(cfg.cards).forEach(function (c) { cards(c); });                    // fan / stagger / stairs / stack card effects
  if (cfg.faq) faq(cfg.faq);                          // animated <details> accordion
  if (cfg.magnet) magnet(cfg.magnet);                   // buttons pulled toward the pointer
  if (cfg.videoExpand) videoExpand(cfg.videoExpand);    // video opens in place at full width
  if (cfg.decor) decor(cfg.decor);                      // icons / patterns copied from the design
  if (cfg.hoverFx) hoverFx(cfg.hoverFx);               // link underline draw + button text roll on hover
  if (cfg.sprintLines) sprintLines(cfg.sprintLines);   // before parallax: it swaps the <img> for an SVG
  if (cfg.scrollParallax) scrollParallax(cfg.scrollParallax === true ? {} : cfg.scrollParallax);
  if (cfg.mouseParallax) mouseParallax(cfg.mouseParallax === true ? {} : cfg.mouseParallax);
  if (cfg.finishLine) finishLine();
  if (typeof cfg.custom === "function") cfg.custom({ gsap: window.gsap, ScrollTrigger: window.ScrollTrigger });
  releaseHide();
}
