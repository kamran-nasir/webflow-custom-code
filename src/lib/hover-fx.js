import { toArray, whenReady } from "./core.js";

/* HOVER EFFECTS (copied from the Halloween master's links and buttons)
   Pure CSS transitions, injected as one <style>; the only JS is wrapping button labels so the text can roll.

   hoverFx({
     underline: {                                  // inline links: a line draws under the text (left to right on enter,
       items: ".nav-link, .foot-link, .card-link",   //   leaves to the right), 2px, currentColor, 0.45s
       triggers: ".card"                           // optional: hovering this container also draws the line on its items
     },
     buttons: {                                    // filled buttons: the label rolls up and a copy rolls in, the icon turns 45 degrees
       items: ".pill, .cta",
       label: ".cta-label",                        // element holding the text (default: the button itself)
       icon: ".cta-ico",                           // optional; rotates on hover
       iconSvg: "<svg ...>...</svg>"               // optional: markup that replaces the icon's content (e.g. the Figma arrow)
     }
   })

   Cards can also lift on hover:
     lift: { items: ".card", distance: 8,              // px the card rises (uses `top` on a position:relative card, so it never
             nudge: ".card-link .icon", nudgeX: 6 }      //   fights GSAP's transform/translate); nudge = an inner element that slides right
   Hover only; with reduced motion the transitions are switched off. */

const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

export function hoverFx(opts) {
  opts = opts || {};
  const css = [];
  const u = opts.underline;
  if (u && u.items) {
    const items = u.items.split(",").map(function (s) { return s.trim(); });
    const on = items.map(function (s) { return s + ":hover::after, " + s + ":focus-visible::after"; });
    (u.triggers ? u.triggers.split(",") : []).forEach(function (t) { items.forEach(function (s) { on.push(t.trim() + ":hover " + s + "::after"); }); });
    css.push(items.map(function (s) { return s; }).join(", ") + "{position:relative;width:fit-content;}");
    css.push(items.map(function (s) { return s + "::after"; }).join(", ") + "{content:\"\";position:absolute;left:0;right:0;bottom:" + (u.offset != null ? u.offset : -4) + "px;height:" + (u.height || 2) + "px;border-radius:2px;background:currentColor;transform:scaleX(0);transform-origin:right center;transition:transform " + (u.duration || 0.45) + "s " + EASE + ";pointer-events:none;}");
    css.push(on.join(", ") + "{transform:scaleX(1);transform-origin:left center;}");
  }
  const l = opts.lift;
  if (l && l.items) {
    const d = l.duration || 0.4, items = l.items.split(",").map(function (x) { return x.trim(); });
    css.push(items.join(", ") + "{position:relative;top:0;transition:top " + d + "s " + EASE + ";}");
    css.push(items.map(function (x) { return x + ":hover"; }).join(", ") + "{top:-" + (l.distance != null ? l.distance : 8) + "px;}");
    if (l.nudge) {
      css.push(l.nudge + "{transition:transform " + d + "s " + EASE + ";}");
      css.push(items.map(function (x) { return x + ":hover " + l.nudge; }).join(", ") + "{transform:translateX(" + (l.nudgeX != null ? l.nudgeX : 6) + "px);}");
    }
  }
  const b = opts.buttons;
  let buttons = [];
  if (b && b.items) {
    const d = b.duration || 0.3;
    css.push(".fx-roll{display:inline-block;position:relative;overflow:hidden;vertical-align:top;}");
    css.push(".fx-roll > span{display:block;transition:transform " + d + "s " + EASE + ";}");
    css.push(".fx-roll > .fx-b{position:absolute;left:0;top:100%;white-space:nowrap;}");
    const hov = b.items.split(",").map(function (s) { return s.trim() + ":hover, " + s.trim() + ":focus-visible"; });
    const sel = function (tail) { return hov.map(function (h) { return h.split(", ").map(function (x) { return x + " " + tail; }).join(", "); }).join(", "); };
    css.push(sel(".fx-roll > span") + "{transform:translateY(-100%);}");
    if (b.icon) {
      css.push(b.icon + "{transition:transform " + d + "s " + EASE + ";}");
      css.push(sel(b.icon) + "{transform:rotate(" + (b.rotate != null ? b.rotate : 45) + "deg);}");
    }
    buttons = toArray(b.items);
  }
  css.push("@media (prefers-reduced-motion: reduce){" + ((l && l.items) ? l.items + ", " : "") + ".fx-roll > span, " + ((u && u.items) ? u.items.split(",").map(function (s) { return s.trim() + "::after"; }).join(", ") + ", " : "") + (b && b.icon ? b.icon + ", " : "") + "html{transition:none !important;}}");
  const style = document.createElement("style");
  style.setAttribute("data-hover-fx", "");
  style.textContent = css.join("\n");
  document.head.appendChild(style);

  whenReady(function () {
    buttons.forEach(function (btn) {
      if (b.icon && b.iconSvg) { const ic = btn.querySelector(b.icon); if (ic) ic.innerHTML = b.iconSvg; }
      const label = (b.label && btn.querySelector(b.label)) || btn;
      if (label.querySelector(".fx-roll")) return;
      const text = label.textContent;
      if (!text.trim() || (label === btn && btn.children.length)) return;     // only plain-text labels are rolled
      label.textContent = "";
      const roll = document.createElement("span"); roll.className = "fx-roll";
      const a = document.createElement("span"); a.className = "fx-a"; a.textContent = text;
      const c = document.createElement("span"); c.className = "fx-b"; c.setAttribute("aria-hidden", "true"); c.textContent = text;
      roll.appendChild(a); roll.appendChild(c); label.appendChild(roll);
    });
  });
}
