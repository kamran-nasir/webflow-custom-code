import { hasGsap, prefersReducedMotion, first, whenReady } from "./core.js";

/* VIDEO EXPAND (the video opens in place, as on weatherkids.org)
   Click the play button: the content beside the video fades out and drifts left (its text never re-wraps) over the same time the column collapses and the video grows, the video grows
   into the freed space to full width (taller too), the play button shrinks away, then the media starts and a close
   button appears. Close (button, Escape): the media stops and everything runs back.

   videoExpand({
     grid: ".hero-grid",      // flex row holding the text column and the video
     left: ".hero-left",      // the column that makes way
     video: ".hero-video",    // the thumbnail box; put the media URL in its data-video attribute
     play: ".play-button" })  // click target (default: the video box)

   data-video can be an .mp4/.webm file, or a YouTube/Vimeo embed URL (https://www.youtube.com/embed/ID,
   https://player.vimeo.com/video/ID). With no data-video the box still expands (thumbnail only). */
export function videoExpand(opts) {
  opts = opts || {};
  if (!hasGsap(false)) return;
  const gsap = window.gsap;
  const grid = first(opts.grid), left = first(opts.left), video = first(opts.video);
  if (!grid || !left || !video) return;
  const play = first(opts.play) || video;
  const dur = prefersReducedMotion() ? 0 : 1.1;
  let open = false, tl = null, media = null, btn = null;

  function mount() {
    const url = video.getAttribute("data-video");
    if (url) {
      const file = /\.(mp4|webm|ogg)(\?|$)/i.test(url);
      media = document.createElement(file ? "video" : "iframe");
      if (file) { media.src = url; media.autoplay = true; media.controls = true; media.playsInline = true; }
      else { media.src = url + (url.indexOf("?") > -1 ? "&" : "?") + "autoplay=1"; media.allow = "autoplay; fullscreen; picture-in-picture"; media.allowFullscreen = true; media.setAttribute("title", "Video"); }
      media.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border:0;background:#000;opacity:0;z-index:2;";
      video.appendChild(media);
      gsap.to(media, { opacity: 1, duration: 0.5 });
    }
    btn = document.createElement("button");
    btn.type = "button"; btn.setAttribute("aria-label", "Close video");
    btn.style.cssText = "position:absolute;top:16px;right:16px;z-index:3;width:44px;height:44px;border:0;border-radius:50%;background:#fff;color:#0e0e0e;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;";
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 2l12 12M14 2L2 14"/></svg>';
    btn.addEventListener("click", close);
    video.appendChild(btn);
    gsap.to(btn, { opacity: 1, duration: 0.4, delay: 0.2 });
  }
  function unmount() {
    if (media) { if (media.pause) media.pause(); media.remove(); media = null; }
    if (btn) { btn.remove(); btn = null; }
  }
  function openIt() {
    if (open) return;
    open = true;
    const cs = getComputedStyle(grid);
    const gw = grid.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const h = Math.max(video.getBoundingClientRect().height, Math.min(window.innerHeight * 0.78, gw * 9 / 16));
    left.style.overflow = "hidden";
    // freeze each child's width first: the column then collapses (clipped) without the text re-wrapping onto more lines
    Array.prototype.forEach.call(left.children, function (c) { c.style.width = c.getBoundingClientRect().width + "px"; c.style.flexShrink = "0"; });
    tl = gsap.timeline({ defaults: { ease: "power3.inOut", duration: dur }, onComplete: mount });
    tl.to(play === video ? [] : play, { scale: 0, autoAlpha: 0, duration: dur ? 0.4 : 0, ease: "power2.in" }, 0)
      .to(left, { autoAlpha: 0, x: -70, duration: dur, ease: "power1.inOut" }, 0)        // fades and drifts left WITH the growth, not before it
      .to(left, { width: 0, marginRight: 0, paddingLeft: 0, paddingRight: 0 }, 0)
      .to(video, { maxWidth: gw, marginLeft: 0, height: h }, 0);
  }
  function close() {
    if (!open) return;
    open = false; unmount();
    tl.eventCallback("onReverseComplete", function () {
      gsap.set([left, video, play], { clearProps: "all" });
      left.style.overflow = "";
      Array.prototype.forEach.call(left.children, function (c) { c.style.width = ""; c.style.flexShrink = ""; });
    });
    tl.reverse();
  }
  whenReady(function () {
    play.addEventListener("click", function (e) { if (!open) { e.preventDefault(); openIt(); } });
    if (play !== video) { play.setAttribute("role", "button"); play.setAttribute("tabindex", "0"); play.setAttribute("aria-label", "Play video");
      play.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openIt(); } }); }
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  });
}
