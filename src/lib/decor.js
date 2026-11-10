import { toArray, whenReady } from "./core.js";

/* DECOR (icons and patterns added to existing Webflow elements)
   Used for artwork taken from the design file (Figma "Copy as SVG"): small icons, a replaced text character, and a
   pattern of squares. Everything is inline SVG that follows the element's text colour (currentColor).

   decor({
     icons: [
       { target: ".card-1 .eyebrow", svg: "<svg ...>" },                       // added before the element's content
       { target: ".card-link", svg: "<svg ...>", char: "›", where: "append" }   // replaces a trailing text character
     ],
     pattern: { size: 16.6, cols: 4, rows: 9, items: [
       { target: ".card-1 .pattern", color: "var(--brand--green-500)", cells: [[1,0],[3,0],[2,1]] }   // [column, row] squares
     ] }
   })

   The icon wrapper is a small flex box with aria-hidden, so screen readers keep reading only the text. */
export function decor(opts) {
  opts = opts || {};
  whenReady(function () {
    (opts.icons || []).forEach(function (it) {
      toArray(it.target).forEach(function (el) {
        if (el.querySelector("[data-decor]")) return;
        if (it.char) {                                                // drop the text character the icon replaces
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let n, last = null;
          while ((n = walker.nextNode())) last = n;
          if (last) last.textContent = last.textContent.replace(new RegExp("\\s*" + it.char + "\\s*$"), "");
        }
        const box = document.createElement("span");
        box.setAttribute("data-decor", ""); box.setAttribute("aria-hidden", "true");
        box.style.cssText = "display:inline-flex;flex:none;align-items:center;";
        box.innerHTML = it.svg;
        if (it.where === "append") el.appendChild(box); else el.insertBefore(box, el.firstChild);
      });
    });
    const p = opts.pattern;
    if (p && p.items) {
      const u = p.size || 16.6, cols = p.cols || 4, rows = p.rows || 9;
      p.items.forEach(function (it) {
        toArray(it.target).forEach(function (el) {
          let r = "";
          it.cells.forEach(function (c) { r += '<rect x="' + (c[0] * u).toFixed(2) + '" y="' + (c[1] * u).toFixed(2) + '" width="' + u + '" height="' + u + '"/>'; });
          el.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (cols * u).toFixed(1) + '" height="' + (rows * u).toFixed(1) + '" viewBox="0 0 ' + (cols * u).toFixed(2) + " " + (rows * u).toFixed(2) + '" fill="currentColor" style="display:block;color:' + (it.color || "currentColor") + '" aria-hidden="true">' + r + "</svg>";
        });
      });
    }
  });
}
