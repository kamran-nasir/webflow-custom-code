// "grand-prix" master animations. ONE bundle shared by every client page built from the Grand Prix master
// (CPP is the first client; later clients are duplicates with new colours/copy, same classes, same JS).
// Source of truth: animations/masters/grand-prix/. `scripts/anim.sh build grand-prix` syncs it into webflow-custom-code and bundles it.
import { init } from "../../lib/index.js";

init({
  name: "grand-prix",

  smoothScroll: true,

  // Page-load sequence. Desktop/tablet: nav, video thumbnail rises, headline, copy + CTA. Phones (<=767px): reading order
  // nav (quick) > headline > subheading > button > HPE logo > video, matching the stacked layout top to bottom.
  heroIntro: {
    order:    "reading",
    readingQuery: "(max-width: 767px)",
    brand:    ".logo-link",
    links:    ".nav-item",
    navRight: ".pill",
    media:    ".hero-video",
    title:    ".hero-title",
    logo:     ".vendor-logo",
    sub:      ".hero-sub",
    button:   ".cta"
  },

  // Everything below the hero reveals as its section scrolls into view.
  reveals: {
    label:   ".tag",
    heading: ".section-title",
    text:    ".intro-p, .slow-intro, .values-sub, .steps-sub, .faq-intro, .cta-p",
    exclude: ".hero, .nav, .intro-p"
  },

  // Gentle depth as sections scroll (% of the section height).
  scrollParallax: {
    items: [
      [".intro-img", -4],
      [".roads", 6]
    ]
  },

  // Hero video thumbnail drifts a touch against the cursor.
  // (The mouse parallax on the hero video was removed: only the play button reacts to the mouse now.)
  // Magnetic play button: only the circle is pulled toward the pointer
  magnet: { items: ".play", strength: 0.35, inner: ".play-svg" },

  // Click play: the text column slides away and the video opens in place at full width. Put the video URL in the
  // .hero-video element's data-video attribute (an .mp4, or a YouTube/Vimeo embed URL).
  videoExpand: { grid: ".hero-grid", left: ".hero-left", video: ".hero-video", play: ".play" },

  // Checkered-flag scroll transition between "What's slowing" and "Why choose" (empty div[data-flag-transition] in the master).
  // Black rules beside copy: draw down as you scroll (scrubbed). The intro rule and the intro text fill share ONE range
  // (start/end below) that finishes while the next section is still below the fold (the next section's top sits ~80 px under
  // the text, so the text is fully filled when its bottom is at 88% of the viewport), so the next section only appears
  // after the text animation is complete. The FAQ and CTA rules use the default range.
  scrollLine: [
    { items: ".faq-col-left, .cta-col-left" },
    { items: ".intro-text, .intro-body", start: "top 88%", end: "bottom 88%" }   // .intro-body carries the rule on tablet/phone (it wraps image + copy); on desktop it is display:contents and skipped
  ],
  // The intro paragraph starts at 50% opacity and fills word by word over the same range as its rule.
  textFill: { items: ".intro-p", image: ".intro-img", trigger: ".intro-text", start: "top 88%", end: "bottom 88%" },

  // Artwork from the Figma file ("Copy as SVG"): eyebrow icons, the chevron on the card links, and the vertical square pattern
  decor: {
    icons: [
      { target: ".rc-1 .rc-eyebrow", svg: '<svg width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 17C11 17 12.5 16 16 16C19.5 16 21 17 21 17V3C21 3 19.5 1 16 1C12.5 1 11 3 11 3C11 3 9.5 1 6 1C2.5 1 1 3 1 3V17C1 17 2.5 16 6 16C9.5 16 11 17 11 17ZM11 3V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
      { target: ".rc-2 .rc-eyebrow", svg: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M10 8.2L16 12L10 15.8V8.2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
      { target: ".rc-3 .rc-eyebrow", svg: '<svg width="17" height="21" viewBox="0 0 17 21" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.70234 11.9625L8.70937 11.9297C8.84531 11.3695 9.01641 10.6711 8.88281 10.0383C8.79375 9.53906 8.42578 9.34453 8.11172 9.33047C7.74141 9.31406 7.41094 9.525 7.32891 9.83203C7.17422 10.3945 7.3125 11.1633 7.56562 12.143C7.24687 12.9023 6.73828 14.0062 6.36563 14.6625C5.67188 15.0211 4.74141 15.5742 4.60312 16.2727C4.575 16.4016 4.60781 16.5656 4.68516 16.7133C4.77187 16.8773 4.91016 17.0039 5.07187 17.0648C5.14219 17.0906 5.22656 17.1117 5.325 17.1117C5.7375 17.1117 6.40547 16.7789 7.29609 15.2508C7.43203 15.2063 7.57266 15.1594 7.70859 15.1125C8.34609 14.8969 9.00703 14.6719 9.60469 14.5711C10.2656 14.925 11.018 15.1523 11.5289 15.1523C12.0352 15.1523 12.2344 14.8523 12.3094 14.6719C12.4406 14.3555 12.3773 13.957 12.1641 13.7438C11.8547 13.4391 11.1023 13.3594 9.93047 13.5047C9.35391 13.1531 8.97656 12.675 8.70234 11.9625ZM6.13125 15.5227C5.80547 15.9961 5.55937 16.2328 5.42578 16.3359C5.58281 16.0477 5.88984 15.743 6.13125 15.5227ZM8.18438 10.0031C8.30625 10.2117 8.28984 10.8422 8.19609 11.1609C8.08125 10.6945 8.06484 10.0336 8.13281 9.95625C8.15156 9.95859 8.16797 9.97266 8.18438 10.0031ZM8.14688 12.8273C8.39766 13.2609 8.71406 13.6336 9.06328 13.9102C8.55703 14.025 8.09531 14.2148 7.68281 14.3836C7.58437 14.4234 7.48828 14.4633 7.39453 14.5008C7.70625 13.9359 7.96641 13.2961 8.14688 12.8273ZM11.7938 14.3625C11.7961 14.3672 11.7984 14.3742 11.7844 14.3836H11.7797L11.775 14.3906C11.7563 14.4023 11.5641 14.5148 10.7367 14.1891C11.6883 14.1445 11.7914 14.3602 11.7938 14.3625ZM16.2797 5.26406L11.2359 0.220313C11.0953 0.0796875 10.9055 0 10.7062 0H0.75C0.335156 0 0 0.335156 0 0.75V20.25C0 20.6648 0.335156 21 0.75 21H15.75C16.1648 21 16.5 20.6648 16.5 20.25V5.79609C16.5 5.59687 16.4203 5.40469 16.2797 5.26406ZM14.7703 6.14062H10.3594V1.72969L14.7703 6.14062ZM14.8125 19.3125H1.6875V1.6875H8.76562V6.75C8.76562 7.01107 8.86934 7.26145 9.05394 7.44606C9.23855 7.63066 9.48893 7.73438 9.75 7.73438H14.8125V19.3125Z" fill="currentColor"/></svg>' },
      { target: ".rc-link", char: "\u203a", where: "append", svg: '<svg width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.460938 0.460938L8.70094 8.70094L0.460938 16.9409" stroke="currentColor" stroke-width="0.92" stroke-linecap="round" stroke-linejoin="round"/></svg>' }
    ],
    pattern: { size: 16.6, cols: 4, rows: 9, items: [
      { target: ".rc-1 .check", color: "var(--brand--primary, #01A982)", cells: [[1,0],[3,0],[2,1],[1,2],[2,3],[1,4],[3,4],[0,5],[2,5],[3,6],[1,7],[3,8]] },
      { target: ".rc-2 .check", color: "var(--neutral--gray-100, #F2F2F2)", cells: [[1,0],[3,0],[2,1],[1,2],[3,2],[2,3],[0,4],[2,5],[1,6],[3,6],[2,7]] },
      { target: ".rc-3 .check", color: "var(--brand--primary, #01A982)", cells: [[1,0],[3,0],[2,1],[1,2],[3,2],[2,3],[0,4],[2,5],[1,6],[3,6],[2,7]] }
    ] }
  },

  // Hover effects from the Halloween master: inline links draw an underline, filled buttons roll their label and turn the arrow
  hoverFx: {
    lift: { items: ".rc", distance: 8, nudge: ".rc-link [data-decor]", nudgeX: 6 },   // the Go deeper cards rise and the chevron slides right
    underline: { items: ".nav-item, .partner-link, .rc-link", triggers: ".rc" },
    buttons: { items: ".pill, .cta", label: ".cta-label", icon: ".cta-ico",
      // the arrow from the design (colour follows the button's text colour)
      iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 15 15" style="display:block"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.066" d="M13.424 1.031 1.031 13.424m12.393-2.065V1.03H3.097"/></svg>' }
  },

  // Fixed header: slides away on scroll down, back on scroll up
  hideHeader: { header: ".nav" },

  // Phone sliders: the card rows scroll-snap in Webflow (<=767px); each has a .slider-nav block after it with prev/next buttons.
  sliderNav: { items: ".slow-cards, .vgrid, .steps-row, .res-cards" },

  // Card effects (desktop): roadblocks fan out from a pile, the six upgrade cards rise in one by one,
  // How It Works cards climb into place as you scroll, Proof From the Track cards slide out from behind the first
  cards: [
    {
      deck:    { items: ".rb", pin: ".slow", start: "center center", length: 1500 },   // roadblock cards: a pinned deck dealt out card by card as you scroll
      stagger: { items: ".vc", container: ".vgrid" },
      stickFill: { items: ".st", container: ".steps-row", track: ".track", dot: ".dot", dotOn: ".dot-on", seg: ".seg" },   // How It Works: sticky stair-step cards are CSS (as on Halloween); this fills each card's steps on its turn
      stack:   { items: ".rc", container: ".res-cards" },
      // Phones (sliders): each card row rises + fades in, one card after another, when its section scrolls into view. (.vc already does this via stagger above.)
      slideUp: [
        { items: ".rb", container: ".slow-cards" },
        { items: ".st", container: ".steps-row" },
        { items: ".rc", container: ".res-cards" }
      ]
    },
    { stagger: { items: ".acc-item", container: ".faq-col-right" } },   // FAQ column: the questions rise in one after another (all screen sizes)
    { stagger: { items: ".card", container: ".card" } }       // CTA form column: the form card rises in
  ],

  // FAQ: answers slide open and shut, the + / - icon turns
  faq: { items: ".acc-item", icon: ".acc-icon", single: true, collapse: "(max-width: 767px)", svg: { size: 22, stroke: 1.75 }, openBg: "var(--neutral--gray-200, #E6E6E6)" },

  finishLine: true,
  sprintLines: {
    items: ".roads",
    svg: { width: 3200, height: 668, stripes: [
      { color: "var(--brand--secondary, #29615A)", points: [[2743.9, 0], [2829.5, 0], [313.7, 668], [106.2, 668]] },
      { color: "var(--neutral--gray-400, #969696)", points: [[2856.4, 0], [2930.1, 0], [555.3, 668], [370.8, 668]] },
      { color: "var(--brand--primary, #01A982)", points: [[2955, 0], [3020.7, 0], [773.9, 668], [607.5, 668]] },
      { color: "var(--neutral--gray-350, #C8C8C8)", points: [[3043.7, 0], [3103.4, 0], [971.4, 668], [821, 668]] },
      { color: "var(--brand--accent, #6ED2B4)", points: [[3124.3, 0], [3181.1, 0], [1152.9, 668], [1014.5, 668]] }
    ] },
    bleed: { top: 400, bottom: 500 }
  }
});
