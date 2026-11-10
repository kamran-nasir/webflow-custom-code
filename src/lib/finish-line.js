import { prefersReducedMotion, toArray } from "./core.js";

/* FINISH LINE (WebGL checkered ground plane)
   Add an empty div with the attribute data-finish-line where the finish line should be
   (e.g. between two sections). JS builds a canvas inside it: a perspective checkered strip whose
   tiles ripple with noise and race with the page scroll.
   Attributes on the div (all optional):
     data-finish-dark / data-finish-light   tile colours: a Webflow variable, e.g. var(--brand--secondary)
     data-finish-height="20"      band height in vw (capped at 50vh)
   Pauses when off screen. Reduced motion: one still frame. No WebGL: nothing is drawn. */
const VERT = "attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.0,1.0);}";
const FRAG = [
"precision mediump float;",
"uniform vec2 u_resolution;uniform float u_time;uniform float u_scroll;uniform vec3 u_dark;uniform vec3 u_light;",
"float random(vec3 pos){pos=fract(pos*vec3(0.1031,0.1030,0.0973));pos+=dot(pos,pos.yxz+33.33);return fract((pos.x+pos.y)*pos.z);}",
"float noise(in vec3 st){vec3 i=floor(st);vec3 f=fract(st);",
"float a=random(i);float b=random(i+vec3(1.0,0.0,0.0));float c=random(i+vec3(0.0,1.0,0.0));float d=random(i+vec3(1.0,1.0,0.0));",
"float e=random(i+vec3(0.0,0.0,1.0));float f1=random(i+vec3(1.0,0.0,1.0));float g=random(i+vec3(0.0,1.0,1.0));float h=random(i+vec3(1.0,1.0,1.0));",
"vec3 u=f*f*(3.0-2.0*f);",
"return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y),mix(mix(e,f1,u.x),mix(g,h,u.x),u.y),u.z);}",
"float noiseTexture(in vec3 st,float scale,float roughness){float value=0.0;float amplitude=1.0;float normalization=0.0;",
"for(int i=0;i<3;i++){float n=noise(st*scale);value+=amplitude*n;normalization+=amplitude;st*=2.0;amplitude*=roughness;}",
"return value/normalization;}",
"void main(){",
"vec2 uv=gl_FragCoord.xy/u_resolution;",
"float scale=41.0;float offset=u_scroll/25.0;float noiseDriver=u_time/400.0+(offset/5.0);",
"float yCenter=uv.y-0.5;float yCenterDistance=abs(yCenter);",
"float warpedY=yCenter/((pow(yCenterDistance,0.88)*7.0)+1.0);",
"float scaledX=(uv.x*(scale/2.0))+0.75;",
"float noiseColumns=floor((scaledX*2.0)+0.5)/scale;",
"float nz=noiseTexture(vec3(noiseColumns,noiseDriver,0.0),scale,1.0)-0.5;",
"float noisyY=warpedY+((nz/2.0)*warpedY);",
"float tileCenterDistance=abs((floor(((noisyY-offset)*scale)+0.5)/scale)+offset);",
"float prox=clamp((1.0-(tileCenterDistance-0.0)/(0.08-0.0))*2.0,0.0,1.0);",
"float eased=smoothstep(0.0,1.0,prox);",
"float wrappedX=fract(scaledX);",
"float wrappedY=fract((noisyY-(offset+0.5))*(scale/2.0)+0.75);",
"float vS=abs(wrappedX-0.5)<0.25?1.0:0.0;float hS=abs(wrappedY-0.5)<0.25?1.0:0.0;",
"float checker=abs(vS-hS)<0.5?1.0:0.0;",
"float darkAlpha=uv.y>0.45?1.0:0.0;",
"vec4 pattern=checker>0.5?vec4(u_dark,darkAlpha):vec4(u_light,1.0);",
"float mx=fract(uv.x*scale);float my=fract((noisyY-offset-0.5)*scale);",
"float dx=abs(mx-0.5)*2.0;float dy=abs(my-0.5)*2.0;",
"float mask=(dx<eased?1.0:0.0)*(dy<eased?1.0:0.0);",
"gl_FragColor=vec4(pattern.rgb,mask*pattern.a);}"
].join("\n");

/* Resolve any CSS colour (hex, rgb(), or var(--webflow-variable, fallback)) to [r,g,b] in 0..1.
   Colours come from the site's Webflow variables, so a client re-skin only changes the variables. */
function cssColor(host, value, fallback) {
  let v = (value || fallback).trim();
  const m = /^var\((--[^,)]+)(?:,\s*(.+))?\)$/.exec(v);
  if (m) {
    const raw = getComputedStyle(host).getPropertyValue(m[1]).trim();
    v = raw || (m[2] || fallback).trim();
  }
  const c = document.createElement("canvas"); c.width = c.height = 1;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillStyle = v; g.fillRect(0, 0, 1, 1);
  const d = g.getImageData(0, 0, 1, 1).data;
  return [d[0] / 255, d[1] / 255, d[2] / 255];
}

export function finishLine() {
  const reduced = prefersReducedMotion();
  toArray("[data-finish-line]").forEach(function (host) {
    const dark = cssColor(host, host.getAttribute("data-finish-dark"), "var(--brand--secondary, #29615A)");
    const light = cssColor(host, host.getAttribute("data-finish-light"), "var(--brand--accent, #6ED2B4)");
    const hv = parseFloat(host.getAttribute("data-finish-height")) || 20;

    host.setAttribute("aria-hidden", "true");
    host.style.cssText += ";position:relative;width:100%;overflow:hidden;pointer-events:none;height:min(" + hv + "vw,50vh);";
    host.innerHTML = "";
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;left:50%;bottom:" + (-hv * 0.55) + "vw;display:block;transform-origin:50% 100%;";
    host.appendChild(canvas);
    const gl = canvas.getContext("webgl", { antialias: false, alpha: true, preserveDrawingBuffer: false });
    if (!gl) return;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const sh = function (type, src) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error("[finish-line] shader:", gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_resolution"), uTime = gl.getUniformLocation(prog, "u_time"), uScroll = gl.getUniformLocation(prog, "u_scroll");
    gl.uniform3fv(gl.getUniformLocation(prog, "u_dark"), dark);
    gl.uniform3fv(gl.getUniformLocation(prog, "u_light"), light);

    let scroll = 0, visible = true, raf = 0;
    const t0 = performance.now();
    const draw = function () {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, ((performance.now() - t0) / 1000) % 600);
      gl.uniform1f(uScroll, scroll);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const loop = function () { if (!visible) { raf = 0; return; } draw(); raf = requestAnimationFrame(loop); };
    const resize = function () {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = host.clientWidth;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(w * dpr);
      canvas.style.width = w + "px"; canvas.style.height = w + "px";
      // perspective ground plane: steeper on phones
      const wide = window.innerWidth >= 768;
      canvas.style.transform = "translateX(-50%) perspective(" + (wide ? 80 : 160) + "vw) rotateX(55deg) scale(" + (wide ? "2.1,1.25" : "2.5,1.5") + ")";
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };
    resize();
    new ResizeObserver(resize).observe(host);
    if (reduced) return;                               // one still frame
    window.addEventListener("scroll", function () { scroll = window.scrollY * 0.003; }, { passive: true });
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { visible = e.isIntersecting || e.boundingClientRect.bottom <= 0; if (visible && !raf) loop(); });
    }, { threshold: 0 }).observe(host);
    loop();
  });
}
