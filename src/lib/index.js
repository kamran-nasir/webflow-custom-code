import { marker, registerPlugins, releaseHide } from "./core.js";
import { smoothScroll } from "./smooth-scroll.js";
import { reveals } from "./reveals.js";
import { scrollParallax, mouseParallax } from "./parallax.js";
import { heroIntro } from "./hero-intro.js";
import { flagTransition } from "./flag-transition.js";

export { smoothScroll, reveals, scrollParallax, mouseParallax, heroIntro, flagTransition };
export * from "./core.js";

/* One call per campaign. Turn on only what the page uses:

   init({
     name: "CAM-05099",
     smoothScroll: true,                         // or { lerp: 0.08 }
     reveals: { label: ".x", heading: ".y", text: ".z", exclude: ".hero" },
     heroIntro: { canvas, brand, links, navRight, media, title, logo, sub, button },
     scrollParallax: true,                       // data-parallax="-5" or { items: [[".sel", -4]] }
     mouseParallax: true,                        // [data-mouse-parallax] > [data-depth] or { container, layers }
     flagTransition: true,                       // div[data-flag-transition]
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
  if (cfg.scrollParallax) scrollParallax(cfg.scrollParallax === true ? {} : cfg.scrollParallax);
  if (cfg.mouseParallax) mouseParallax(cfg.mouseParallax === true ? {} : cfg.mouseParallax);
  if (cfg.flagTransition) flagTransition();
  if (typeof cfg.custom === "function") cfg.custom({ gsap: window.gsap, ScrollTrigger: window.ScrollTrigger });
  releaseHide();
}
