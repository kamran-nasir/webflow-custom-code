import { toArray, whenReady } from "./core.js";

/* SLIDER NAV (prev / next buttons for a horizontally scrolling card row)
   Pair each scroll-snap row with a .slider-nav block directly AFTER it that holds two buttons:
     <div class="slider-nav"><button data-slider="prev">...</button><button data-slider="next">...</button></div>
   One click scrolls the row by one card. A button gets the disabled attribute at the start / end of the row.
   The rows scroll natively (scroll-snap in Webflow), so swiping works with or without this.

   sliderNav({ items: ".row-a, .row-b" })   Needs no GSAP. */
export function sliderNav(opts) {
  opts = opts || {};
  whenReady(function () {
    toArray(opts.items).forEach(function (list) {
      const nav = list.nextElementSibling;
      const btns = nav && nav.querySelectorAll("[data-slider]");
      if (!btns || btns.length < 2) return;
      const step = function () {
        const k = list.children;
        return k.length > 1 ? k[1].getBoundingClientRect().left - k[0].getBoundingClientRect().left : list.clientWidth * 0.8;
      };
      const sync = function () {
        btns[0].disabled = list.scrollLeft < 4;
        btns[1].disabled = list.scrollLeft > list.scrollWidth - list.clientWidth - 4;
      };
      btns.forEach(function (b) {
        b.addEventListener("click", function () {
          list.scrollBy({ left: (b.getAttribute("data-slider") === "next" ? 1 : -1) * step(), behavior: "smooth" });
        });
      });
      list.addEventListener("scroll", sync, { passive: true });
      window.addEventListener("resize", sync);
      sync();
    });
  });
}
